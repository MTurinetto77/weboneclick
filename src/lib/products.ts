import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type ProductListItem = {
  id_producto: number;
  titulo: string;
  slug: string;
  descripcion: string;
  precio: number | null;
  imagen: string | null;
  stockTotal: number;
  /** true si hay filas de stock en DB (sincronizado); false = stock desconocido */
  stockTracked: boolean;
  cuotas_max: number | null;
};

/**
 * Disponibilidad de stock.
 * - Sin filas en `stock` → aún no sincronizado: se considera disponible (como el carrito).
 * - Con filas → inStock solo si la suma de cantidades es > 0.
 */
export function resolveStockAvailability(stocks: { cantidad: unknown }[]) {
  const stockTotal = stocks.reduce((acc, s) => acc + Number(s.cantidad || 0), 0);
  const stockTracked = stocks.length > 0;
  return {
    stockTotal,
    stockTracked,
    inStock: !stockTracked || stockTotal > 0,
  };
}

export type CharacteristicFilterDef = {
  id_caracteristica: number;
  nombre: string;
  tipo: "numerico" | "cualitativo";
  valores: string[];
  min: number | null;
  max: number | null;
};

export type AppliedCharacteristicFilter = {
  id_caracteristica: number;
  tipo: "numerico" | "cualitativo";
  valores?: string[];
  min?: number;
  max?: number;
};

function pickCurrentPrice(
  precios: { fecha_desde: Date; precio: Prisma.Decimal }[],
  today = new Date()
): number | null {
  const eligible = precios
    .filter((p) => p.fecha_desde <= today)
    .sort((a, b) => b.fecha_desde.getTime() - a.fecha_desde.getTime());
  if (!eligible.length) return null;
  return Number(eligible[0].precio);
}

let categoryTreeCache: { id_categoria: number; id_cat_superior: number | null }[] | null = null;

async function getCategoryEdges() {
  if (!categoryTreeCache) {
    categoryTreeCache = await prisma.categoria.findMany({
      select: { id_categoria: true, id_cat_superior: true },
    });
  }
  return categoryTreeCache;
}

export async function getCategoryFilterDefinitions(
  categoriaId: number
): Promise<CharacteristicFilterDef[]> {
  const categoryIds = await getCategoryAndDescendantIds(categoriaId);

  const linked = await prisma.caracteristica_categoria.findMany({
    where: { id_categoria: { in: categoryIds } },
    include: { caracteristica: true },
  });

  const uniqueChars = new Map<number, string>();
  for (const row of linked) {
    uniqueChars.set(row.id_caracteristica, row.caracteristica.nombre);
  }
  if (!uniqueChars.size) return [];

  const values = await prisma.producto_caracteristica.findMany({
    where: {
      id_caracteristica: { in: [...uniqueChars.keys()] },
      producto: {
        activo: true,
        categorias: { some: { id_categoria: { in: categoryIds } } },
      },
    },
    select: {
      id_caracteristica: true,
      valor: true,
      valor_numerico: true,
    },
  });

  const byChar = new Map<
    number,
    { valores: Set<string>; numericCount: number; total: number; nums: number[] }
  >();

  for (const id of uniqueChars.keys()) {
    byChar.set(id, { valores: new Set(), numericCount: 0, total: 0, nums: [] });
  }

  for (const row of values) {
    const bucket = byChar.get(row.id_caracteristica);
    if (!bucket) continue;
    bucket.total += 1;
    if (row.valor_numerico) {
      bucket.numericCount += 1;
      const n = Number(row.valor.replace(",", "."));
      if (!Number.isNaN(n)) bucket.nums.push(n);
    } else if (row.valor.trim()) {
      bucket.valores.add(row.valor.trim());
    }
  }

  const defs: CharacteristicFilterDef[] = [];
  for (const [id, nombre] of uniqueChars) {
    const bucket = byChar.get(id)!;
    const isNumeric = bucket.total > 0 && bucket.numericCount >= bucket.total / 2;
    if (isNumeric) {
      defs.push({
        id_caracteristica: id,
        nombre,
        tipo: "numerico",
        valores: [],
        min: bucket.nums.length ? Math.min(...bucket.nums) : null,
        max: bucket.nums.length ? Math.max(...bucket.nums) : null,
      });
    } else {
      defs.push({
        id_caracteristica: id,
        nombre,
        tipo: "cualitativo",
        valores: [...bucket.valores].sort((a, b) => a.localeCompare(b, "es")),
        min: null,
        max: null,
      });
    }
  }

  return defs.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

async function productIdsMatchingNumericFilters(
  filters: AppliedCharacteristicFilter[],
  categoryIds?: number[]
): Promise<number[] | null> {
  const numeric = filters.filter((f) => f.tipo === "numerico");
  if (!numeric.length) return null;

  let ids: number[] | null = null;

  for (const filter of numeric) {
    const rows = await prisma.producto_caracteristica.findMany({
      where: {
        id_caracteristica: filter.id_caracteristica,
        valor_numerico: true,
        producto: {
          activo: true,
          ...(categoryIds
            ? { categorias: { some: { id_categoria: { in: categoryIds } } } }
            : {}),
        },
      },
      select: { id_producto: true, valor: true },
    });

    const matching: number[] = [];
    for (const row of rows) {
      const n = Number(row.valor.replace(",", "."));
      if (Number.isNaN(n)) continue;
      if (filter.min != null && n < filter.min) continue;
      if (filter.max != null && n > filter.max) continue;
      matching.push(row.id_producto);
    }

    if (!ids) {
      ids = matching;
    } else {
      const allow = new Set(matching);
      ids = ids.filter((id) => allow.has(id));
    }
  }

  return ids ?? [];
}

export async function getActiveProducts(options?: {
  q?: string;
  categoriaId?: number;
  marcaId?: number;
  characteristicFilters?: AppliedCharacteristicFilter[];
  take?: number;
  skip?: number;
}): Promise<{ items: ProductListItem[]; total: number }> {
  const where: Prisma.productoWhereInput = {
    activo: true,
  };

  if (options?.q) {
    where.titulo = { contains: options.q };
  }

  if (options?.marcaId) {
    where.id_marca = options.marcaId;
  }

  let categoryIds: number[] | undefined;
  if (options?.categoriaId) {
    categoryIds = await getCategoryAndDescendantIds(options.categoriaId);
    where.categorias = {
      some: { id_categoria: { in: categoryIds } },
    };
  }

  const filters = options?.characteristicFilters ?? [];
  const qualitative = filters.filter((f) => f.tipo === "cualitativo" && f.valores?.length);

  if (qualitative.length) {
    where.AND = qualitative.map((f) => ({
      caracteristicas: {
        some: {
          id_caracteristica: f.id_caracteristica,
          valor: { in: f.valores },
        },
      },
    }));
  }

  const numericIds = await productIdsMatchingNumericFilters(filters, categoryIds);
  if (numericIds) {
    where.id_producto = { in: numericIds.length ? numericIds : [-1] };
  }

  const take = options?.take ?? 24;
  const skip = options?.skip ?? 0;

  // Consulta liviana: sin descripcion TEXT, 1 precio reciente, 1 imagen, stock agregado
  const [rows, total] = await Promise.all([
    prisma.producto.findMany({
      where,
      select: {
        id_producto: true,
        titulo: true,
        slug: true,
        cuotas_max: true,
        precios: {
          orderBy: { fecha_desde: "desc" },
          take: 1,
          select: { fecha_desde: true, precio: true },
        },
        archivos: {
          take: 1,
          select: { archivo: { select: { link: true } } },
        },
        stocks: { select: { cantidad: true } },
      },
      orderBy: { id_producto: "desc" },
      take,
      skip,
    }),
    prisma.producto.count({ where }),
  ]);

  const items: ProductListItem[] = rows.map((p) => {
    const stock = resolveStockAvailability(p.stocks);
    return {
      id_producto: p.id_producto,
      titulo: p.titulo,
      slug: p.slug,
      descripcion: "",
      precio: pickCurrentPrice(p.precios),
      imagen: p.archivos[0]?.archivo.link ?? null,
      stockTotal: stock.stockTotal,
      stockTracked: stock.stockTracked,
      cuotas_max: p.cuotas_max,
    };
  });

  return { items, total };
}

export async function getProductById(id: number) {
  const product = await prisma.producto.findFirst({
    where: { id_producto: id, activo: true },
    include: {
      precios: { orderBy: { fecha_desde: "desc" } },
      archivos: { include: { archivo: true } },
      stocks: { include: { almacen: true } },
      categorias: { include: { categoria: true } },
      caracteristicas: { include: { caracteristica: true } },
      marca: true,
      etiquetas: { include: { etiqueta: true } },
    },
  });
  if (!product) return null;

  const stock = resolveStockAvailability(product.stocks);
  return {
    ...product,
    precio: pickCurrentPrice(product.precios),
    stockTotal: stock.stockTotal,
    stockTracked: stock.stockTracked,
    inStock: stock.inStock,
  };
}

export async function getProductBySlug(slug: string) {
  const product = await prisma.producto.findFirst({
    where: { slug, activo: true },
    include: {
      precios: { orderBy: { fecha_desde: "desc" } },
      archivos: { include: { archivo: true } },
      stocks: { include: { almacen: true } },
      categorias: { include: { categoria: true } },
      caracteristicas: { include: { caracteristica: true } },
      marca: true,
      etiquetas: { include: { etiqueta: true } },
    },
  });
  if (!product) return null;

  const stock = resolveStockAvailability(product.stocks);
  return {
    ...product,
    precio: pickCurrentPrice(product.precios),
    stockTotal: stock.stockTotal,
    stockTracked: stock.stockTracked,
    inStock: stock.inStock,
  };
}

export async function getActiveBanners(ubicacion?: string) {
  const now = new Date();
  return prisma.banner.findMany({
    where: {
      activo: true,
      vigencia_desde: { lte: now },
      OR: [{ vigencia_hasta: null }, { vigencia_hasta: { gte: now } }],
      ...(ubicacion ? { ubicacion } : {}),
    },
    orderBy: [{ orden: "asc" }, { id_banner: "asc" }],
  });
}

export async function getCategoryBySlugPath(slugs: string[]) {
  if (!slugs.length) return null;

  // Prefer exact hierarchical match
  let parentId: number | null = null;
  let found = null;
  let hierarchicalOk = true;
  for (const slug of slugs) {
    found = await prisma.categoria.findFirst({
      where: {
        slug,
        ...(parentId == null ? {} : { id_cat_superior: parentId }),
      },
      include: { subcategorias: { orderBy: { nombre: "asc" } } },
    });
    if (!found) {
      hierarchicalOk = false;
      break;
    }
    parentId = found.id_categoria;
  }
  if (hierarchicalOk && found) return found;

  // Fallback: match deepest slug regardless of parent (Odoo paths may differ from web)
  const last = slugs[slugs.length - 1];
  const byLast = await prisma.categoria.findFirst({
    where: { slug: last },
    include: { subcategorias: { orderBy: { nombre: "asc" } } },
  });
  if (byLast) return byLast;

  // Fallback: Woo-style path → Odoo flat slug (accesorios/fundas-y-cobertores → accesorios-fundas-y-cobertores)
  return prisma.categoria.findFirst({
    where: { slug: slugs.join("-") },
    include: { subcategorias: { orderBy: { nombre: "asc" } } },
  });
}

export async function getMegaMenuCategories() {
  return prisma.categoria.findMany({
    where: { nivel: 1 },
    orderBy: { nombre: "asc" },
    take: 12,
    select: {
      id_categoria: true,
      nombre: true,
      slug: true,
      subcategorias: {
        orderBy: { nombre: "asc" },
        take: 20,
        select: { id_categoria: true, nombre: true, slug: true },
      },
    },
  });
}

export async function getCategoryTree() {
  return prisma.categoria.findMany({
    orderBy: [{ nivel: "asc" }, { nombre: "asc" }],
  });
}

export async function getCategoryAndDescendantIds(rootId: number): Promise<number[]> {
  const all = await getCategoryEdges();
  const ids = new Set<number>([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of all) {
      if (c.id_cat_superior != null && ids.has(c.id_cat_superior) && !ids.has(c.id_categoria)) {
        ids.add(c.id_categoria);
        changed = true;
      }
    }
  }
  return [...ids];
}

/** Parsea query params c{id}=valor y c{id}_min / c{id}_max */
export function parseCharacteristicFilters(
  params: Record<string, string | string[] | undefined>,
  defs: CharacteristicFilterDef[]
): AppliedCharacteristicFilter[] {
  const applied: AppliedCharacteristicFilter[] = [];

  for (const def of defs) {
    if (def.tipo === "cualitativo") {
      const key = `c${def.id_caracteristica}`;
      const raw = params[key];
      const valores = (Array.isArray(raw) ? raw : raw ? [raw] : [])
        .map((v) => String(v).trim())
        .filter(Boolean)
        .filter((v) => def.valores.includes(v));
      if (valores.length) {
        applied.push({
          id_caracteristica: def.id_caracteristica,
          tipo: "cualitativo",
          valores,
        });
      }
    } else {
      const minRaw = params[`c${def.id_caracteristica}_min`];
      const maxRaw = params[`c${def.id_caracteristica}_max`];
      const minStr = Array.isArray(minRaw) ? minRaw[0] : minRaw;
      const maxStr = Array.isArray(maxRaw) ? maxRaw[0] : maxRaw;
      const min = minStr != null && minStr !== "" ? Number(minStr) : undefined;
      const max = maxStr != null && maxStr !== "" ? Number(maxStr) : undefined;
      if ((min != null && !Number.isNaN(min)) || (max != null && !Number.isNaN(max))) {
        applied.push({
          id_caracteristica: def.id_caracteristica,
          tipo: "numerico",
          min: min != null && !Number.isNaN(min) ? min : undefined,
          max: max != null && !Number.isNaN(max) ? max : undefined,
        });
      }
    }
  }

  return applied;
}

export { pickCurrentPrice };
