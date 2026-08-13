import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  isSellableAlmacen,
  sumSellableStock,
  type StockRow,
} from "@/lib/almacenes";

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
  /** Ruta de imagen de etiqueta de promo (esquina superior derecha de la card) */
  promoBadge?: string | null;
};

/**
 * Disponibilidad de stock (solo almacenes vendibles).
 * - Sin filas vendibles → aún no sincronizado: se considera disponible (como el carrito).
 * - Con filas → inStock solo si la suma de cantidades vendibles es > 0.
 */
export function resolveStockAvailability(stocks: StockRow[]) {
  const sellable = stocks.filter((s) => isSellableAlmacen(s.almacen));
  const stockTotal = sumSellableStock(stocks);
  const stockTracked = sellable.length > 0;
  return {
    stockTotal,
    stockTracked,
    inStock: !stockTracked || stockTotal > 0,
  };
}

/** Ordena imágenes del PDP: principal de Odoo primero, luego galería. */
export function sortProductImageLinks(
  archivos: { link: string | null; tipo: string; id_archivo: number }[]
): string[] {
  const sorted = [...archivos]
    .filter((a): a is { link: string; tipo: string; id_archivo: number } => Boolean(a.link))
    .sort((a, b) => {
      const pa = a.tipo === "imagen_principal" ? 0 : 1;
      const pb = b.tipo === "imagen_principal" ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return a.id_archivo - b.id_archivo;
    })
    .map((a) => a.link);

  // Evitar duplicar la principal si Odoo la repite en product.image
  const seen = new Set<string>();
  return sorted.filter((link) => {
    const key = link.split("/").pop() ?? link;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Sucursales visibles en el PDP (mismas etiquetas que el sitio actual). */
export const PDP_STORE_LOCATIONS: {
  name: string;
  match: RegExp[];
  warehouseOdooId?: number;
  shipping?: boolean;
}[] = [
  { name: "Alto Rosario", match: [/alto\s*rosario/i] },
  { name: "Palermo Soho", match: [/palermo/i] },
  { name: "Rosario Centro", match: [/rosario\s*centro/i] },
  {
    name: "Envío a Domicilio",
    match: [/warehouse/i, /\(WH\)/i, /\bWH\b/],
    shipping: true,
  },
  { name: "Solar Shopping", match: [/\bsolar\b/i] },
  { name: "DOT Baires Shopping", match: [/\bdot\b/i] },
  { name: "Cordoba Shopping", match: [/c[oó]rdoba/i] },
];

export type StoreAvailabilityItem = {
  name: string;
  available: boolean;
};

/** Disponibilidad por sucursal a partir del stock desglosado por almacén. */
export function resolveStoreAvailability(
  stocks: (StockRow & { almacen?: { odoo_id: number | null; descripcion?: string; es_envio_domicilio?: boolean } | null })[]
): StoreAvailabilityItem[] {
  return PDP_STORE_LOCATIONS.map((loc) => {
    const qty = stocks
      .filter((s) => {
        if ("shipping" in loc && loc.shipping) {
          return Boolean(s.almacen?.es_envio_domicilio);
        }
        const odooId = s.almacen?.odoo_id;
        if ("warehouseOdooId" in loc && loc.warehouseOdooId != null) {
          return odooId === loc.warehouseOdooId;
        }
        const desc = s.almacen?.descripcion ?? "";
        return loc.match.some((re) => re.test(desc));
      })
      .reduce((acc, s) => acc + Number(s.cantidad || 0), 0);
    return { name: loc.name, available: qty > 0 };
  });
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

export type ShopOrder = "ultimos" | "precio-asc" | "precio-desc" | "nombre";

export type ShopCategoryNode = {
  id_categoria: number;
  nombre: string;
  slug: string;
  count: number;
  children: ShopCategoryNode[];
};

export type ShopBrandFacet = {
  id_marca: number;
  nombre: string;
  slug: string;
  count: number;
};

export type ShopFacets = {
  categories: ShopCategoryNode[];
  brands: ShopBrandFacet[];
  priceMin: number;
  priceMax: number;
};

/** IDs de categoría a filtrar: incluye hijos por jerarquía Prisma o por nombre "Padre / Hijo". */
export async function resolveCategoryFilterIds(categoriaId: number): Promise<number[]> {
  const cat = await prisma.categoria.findUnique({
    where: { id_categoria: categoriaId },
    select: { id_categoria: true, nombre: true },
  });
  if (!cat) return [];

  const byTree = await getCategoryAndDescendantIds(categoriaId);
  if (!cat.nombre.includes(" / ")) {
    const byName = await prisma.categoria.findMany({
      where: { nombre: { startsWith: `${cat.nombre} /` } },
      select: { id_categoria: true },
    });
    return [...new Set([...byTree, ...byName.map((c) => c.id_categoria)])];
  }
  return byTree.length ? byTree : [categoriaId];
}

export async function resolveCategoryFilterIdsBySlug(
  slug: string
): Promise<{ id: number; nombre: string; slug: string } | null> {
  const cat = await prisma.categoria.findUnique({
    where: { slug },
    select: { id_categoria: true, nombre: true, slug: true },
  });
  if (!cat) return null;
  return { id: cat.id_categoria, nombre: cat.nombre, slug: cat.slug };
}

/** Facetas del sidebar de /shop: categorías con conteo, marcas y rango de precios.
 *  Si se pasa `ids`, los conteos y rangos se restringen a ese conjunto de productos. */
export async function getShopFacets(options?: { ids?: number[] }): Promise<ShopFacets> {
  const ids = options?.ids;
  if (ids && ids.length === 0) {
    return { categories: [], brands: [], priceMin: 0, priceMax: 0 };
  }

  const productWhere: Prisma.productoWhereInput = {
    activo: true,
    ...(ids ? { id_producto: { in: ids } } : {}),
  };

  const [categories, brands, priceRows] = await Promise.all([
    prisma.categoria.findMany({
      select: {
        id_categoria: true,
        nombre: true,
        slug: true,
        id_cat_superior: true,
        productos: {
          where: { producto: productWhere },
          select: { id_producto: true },
        },
      },
      orderBy: { nombre: "asc" },
    }),
    prisma.marca.findMany({
      where: { activo: true },
      select: {
        id_marca: true,
        nombre: true,
        slug: true,
        _count: { select: { productos: { where: productWhere } } },
      },
      orderBy: { nombre: "asc" },
    }),
    ids
      ? prisma.$queryRaw<{ min_p: Prisma.Decimal | null; max_p: Prisma.Decimal | null }[]>`
          SELECT MIN(pp.precio) AS min_p, MAX(pp.precio) AS max_p
          FROM precio_producto pp
          INNER JOIN producto p ON p.id_producto = pp.id_producto
          WHERE p.activo = 1
            AND p.id_producto IN (${Prisma.join(ids)})
            AND pp.fecha_desde = (
              SELECT MAX(pp2.fecha_desde)
              FROM precio_producto pp2
              WHERE pp2.id_producto = pp.id_producto
                AND pp2.fecha_desde <= CURDATE()
            )
        `
      : prisma.$queryRaw<{ min_p: Prisma.Decimal | null; max_p: Prisma.Decimal | null }[]>`
          SELECT MIN(pp.precio) AS min_p, MAX(pp.precio) AS max_p
          FROM precio_producto pp
          INNER JOIN producto p ON p.id_producto = pp.id_producto
          WHERE p.activo = 1
            AND pp.fecha_desde = (
              SELECT MAX(pp2.fecha_desde)
              FROM precio_producto pp2
              WHERE pp2.id_producto = pp.id_producto
                AND pp2.fecha_desde <= CURDATE()
            )
        `,
  ]);

  type Flat = {
    id_categoria: number;
    nombre: string;
    slug: string;
    id_cat_superior: number | null;
    count: number;
    displayName: string;
    parentKey: string | null;
  };

  const flat: Flat[] = categories.map((c) => {
    const parts = c.nombre.split(" / ");
    const isChild = parts.length > 1;
    return {
      id_categoria: c.id_categoria,
      nombre: c.nombre,
      slug: c.slug,
      id_cat_superior: c.id_cat_superior,
      count: c.productos.length,
      displayName: isChild ? parts.slice(1).join(" / ") : c.nombre,
      parentKey: isChild ? parts[0].trim() : null,
    };
  });

  const roots: ShopCategoryNode[] = [];
  const childrenByParent = new Map<string, Flat[]>();

  for (const c of flat) {
    if (c.parentKey) {
      const list = childrenByParent.get(c.parentKey) ?? [];
      list.push(c);
      childrenByParent.set(c.parentKey, list);
    }
  }

  const rootCandidates = flat.filter((c) => !c.parentKey);
  for (const root of rootCandidates) {
    // Ocultar categorías técnicas vacías poco útiles en la tienda
    if (["all", "parts", "servicio"].includes(root.slug)) continue;

    const namedChildren = childrenByParent.get(root.nombre) ?? [];
    const treeChildren = flat.filter(
      (c) => c.id_cat_superior === root.id_categoria && c.id_categoria !== root.id_categoria
    );
    const childMap = new Map<number, Flat>();
    for (const ch of [...namedChildren, ...treeChildren]) {
      childMap.set(ch.id_categoria, ch);
    }
    const children = [...childMap.values()]
      .filter((ch) => ch.count > 0)
      .map((ch) => ({
        id_categoria: ch.id_categoria,
        nombre: ch.displayName,
        slug: ch.slug,
        count: ch.count,
        children: [] as ShopCategoryNode[],
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

    const rolled = root.count + children.reduce((acc, ch) => acc + ch.count, 0);
    if (rolled <= 0 && children.length === 0) continue;

    roots.push({
      id_categoria: root.id_categoria,
      nombre: root.displayName,
      slug: root.slug,
      count: rolled,
      children,
    });
  }

  // Hojas huérfanas "Padre / Hijo" cuyo padre no existe como categoría raíz
  for (const [parentName, kids] of childrenByParent) {
    if (roots.some((r) => r.nombre === parentName)) continue;
    const parent = flat.find((c) => c.nombre === parentName);
    const children = kids
      .filter((ch) => ch.count > 0)
      .map((ch) => ({
        id_categoria: ch.id_categoria,
        nombre: ch.displayName,
        slug: ch.slug,
        count: ch.count,
        children: [] as ShopCategoryNode[],
      }));
    if (!children.length) continue;
    roots.push({
      id_categoria: parent?.id_categoria ?? kids[0].id_categoria,
      nombre: parentName,
      slug: parent?.slug ?? kids[0].slug,
      count: children.reduce((a, c) => a + c.count, 0),
      children,
    });
  }

  roots.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const brandFacets = brands
    .filter((b) => b._count.productos > 0)
    .map((b) => ({
      id_marca: b.id_marca,
      nombre: b.nombre,
      slug: b.slug,
      count: b._count.productos,
    }));

  const priceMin = Number(priceRows[0]?.min_p ?? 0);
  const priceMax = Number(priceRows[0]?.max_p ?? 0);

  return {
    categories: roots,
    brands: brandFacets,
    priceMin: Number.isFinite(priceMin) ? Math.floor(priceMin) : 0,
    priceMax: Number.isFinite(priceMax) ? Math.ceil(priceMax) : 0,
  };
}

async function currentPricesByProductIds(
  ids: number[]
): Promise<Map<number, number>> {
  if (!ids.length) return new Map();
  const rows = await prisma.precio_producto.findMany({
    where: {
      id_producto: { in: ids },
      fecha_desde: { lte: new Date() },
    },
    orderBy: { fecha_desde: "desc" },
    select: { id_producto: true, precio: true },
  });
  const map = new Map<number, number>();
  for (const row of rows) {
    if (!map.has(row.id_producto)) {
      map.set(row.id_producto, Number(row.precio));
    }
  }
  return map;
}

export async function getActiveProducts(options?: {
  q?: string;
  categoriaId?: number;
  /** OR de categorías puntuales (sin expandir subcategorías, a diferencia de categoriaId) */
  categoriaIds?: number[];
  marcaId?: number;
  /** Restringir a un conjunto de IDs (p.ej. productos de una promoción) */
  ids?: number[];
  characteristicFilters?: AppliedCharacteristicFilter[];
  take?: number;
  skip?: number;
  order?: ShopOrder;
  minPrice?: number;
  maxPrice?: number;
  /** Si false, no carga badges de promo (default true) */
  withPromoBadges?: boolean;
}): Promise<{ items: ProductListItem[]; total: number }> {
  const where: Prisma.productoWhereInput = {
    activo: true,
  };

  if (options?.ids) {
    if (options.ids.length === 0) {
      return { items: [], total: 0 };
    }
    where.id_producto = { in: options.ids };
  }

  if (options?.q) {
    where.titulo = { contains: options.q };
  }

  if (options?.marcaId) {
    where.id_marca = options.marcaId;
  }

  let categoryIds: number[] | undefined;
  if (options?.categoriaId) {
    categoryIds = await resolveCategoryFilterIds(options.categoriaId);
    where.categorias = {
      some: { id_categoria: { in: categoryIds } },
    };
  } else if (options?.categoriaIds?.length) {
    where.categorias = {
      some: { id_categoria: { in: options.categoriaIds } },
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
    const intersect = options?.ids
      ? numericIds.filter((id) => options.ids!.includes(id))
      : numericIds;
    where.id_producto = { in: intersect.length ? intersect : [-1] };
  }

  const take = options?.take ?? 24;
  const skip = options?.skip ?? 0;
  const order = options?.order ?? "ultimos";
  const needsPricePass =
    order === "precio-asc" ||
    order === "precio-desc" ||
    options?.minPrice != null ||
    options?.maxPrice != null;

  async function attachBadges(items: ProductListItem[]): Promise<ProductListItem[]> {
    if (options?.withPromoBadges === false || !items.length) return items;
    const { getPromoBadges } = await import("@/lib/promos");
    const badges = await getPromoBadges(items.map((i) => i.id_producto));
    return items.map((item) => ({
      ...item,
      promoBadge: badges.get(item.id_producto) ?? null,
    }));
  }

  if (!needsPricePass) {
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
            where: { archivo: { tipo: "imagen_principal" } },
            take: 1,
            select: { archivo: { select: { link: true } } },
          },
          stocks: { include: { almacen: { select: { odoo_id: true, descripcion: true } } } },
        },
        orderBy:
          order === "nombre" ? { titulo: "asc" } : { id_producto: "desc" },
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

    return { items: await attachBadges(items), total };
  }

  // Orden/filtro por precio: resolver IDs + precio actual, luego paginar
  const candidates = await prisma.producto.findMany({
    where,
    select: { id_producto: true, titulo: true },
  });
  const priceMap = await currentPricesByProductIds(candidates.map((c) => c.id_producto));

  let ranked = candidates.map((c) => ({
    id_producto: c.id_producto,
    titulo: c.titulo,
    precio: priceMap.get(c.id_producto) ?? null,
  }));

  if (options?.minPrice != null) {
    ranked = ranked.filter((r) => r.precio != null && r.precio >= options.minPrice!);
  }
  if (options?.maxPrice != null) {
    ranked = ranked.filter((r) => r.precio != null && r.precio <= options.maxPrice!);
  }

  ranked.sort((a, b) => {
    if (order === "precio-asc") {
      return (a.precio ?? Number.POSITIVE_INFINITY) - (b.precio ?? Number.POSITIVE_INFINITY);
    }
    if (order === "precio-desc") {
      return (b.precio ?? Number.NEGATIVE_INFINITY) - (a.precio ?? Number.NEGATIVE_INFINITY);
    }
    return a.titulo.localeCompare(b.titulo, "es");
  });

  const total = ranked.length;
  const pageIds = ranked.slice(skip, skip + take).map((r) => r.id_producto);
  if (!pageIds.length) return { items: [], total };

  const rows = await prisma.producto.findMany({
    where: { id_producto: { in: pageIds } },
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
        where: { archivo: { tipo: "imagen_principal" } },
        take: 1,
        select: { archivo: { select: { link: true } } },
      },
      stocks: { include: { almacen: { select: { odoo_id: true, descripcion: true } } } },
    },
  });
  const byId = new Map(rows.map((r) => [r.id_producto, r]));
  const items: ProductListItem[] = pageIds
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((p) => {
      const stock = resolveStockAvailability(p!.stocks);
      return {
        id_producto: p!.id_producto,
        titulo: p!.titulo,
        slug: p!.slug,
        descripcion: "",
        precio: pickCurrentPrice(p!.precios),
        imagen: p!.archivos[0]?.archivo.link ?? null,
        stockTotal: stock.stockTotal,
        stockTracked: stock.stockTracked,
        cuotas_max: p!.cuotas_max,
      };
    });

  return { items: await attachBadges(items), total };
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

/**
 * `caracteristica` / `producto_caracteristica` están vacías en toda la base (no es un
 * problema de este producto puntual: se verificó contra el dump completo). Hasta que
 * se cargue esa data real, se derivan specs estructuradas del propio título y
 * descripción del producto — ambos ya son texto real de Odoo/oneclickstore.com, no
 * texto inventado. El patrón de título se verificó contra los ~20 MacBook Pro activos
 * y contra oneclickstore.com/producto/... . Si el título no matchea (falta el nombre
 * del chip, orden distinto, etc.) se devuelve lo que sí se pudo leer — nunca se
 * inventa un valor que no está en el texto real. En cuanto `producto_caracteristica`
 * tenga filas reales, `effectiveSpecsFrom` las prioriza solas, sin tocar este parser.
 */
const COLOR_ALIASES: Record<string, string> = {
  "space black": "Negro Espacial",
  "silver": "Plateado",
  "yellow": "Amarillo",
  "pink": "Rosa",
  "indigo": "Índigo",
};

function normalizeColorName(raw: string): string {
  const key = raw.trim().toLowerCase();
  return COLOR_ALIASES[key] ?? raw.trim();
}

function normalizeKeyboardName(raw: string): string {
  return /ingl[eé]s|english/i.test(raw) ? "Inglés" : "Español";
}

const TITLE_SPEC_RE =
  /^(?:CTO\s+)?MacBook\s+(?:Pro|Neo)\s+(\d+)(?:\s+(M\d+|A\d+)(?:\s+(Pro|Max))?)?\s+(\d+)\s*CPU\s+(\d+)\s*GPU\s+(\d+)\s*(?:GB|RAM)\s+(\d+(?:GB|TB))\s*(?:SSD)?\s*[-/]?\s*(.*)$/i;

const KEYBOARD_HINT_RE = /ingl[eé]s|english|espa[ñn]ol|spanish|teclado|keyboard/i;
const TOUCH_ID_HINT_RE = /touch id/i;

type TitleDerivedSpecs = {
  tamano: string;
  chip: string | null;
  cpu: string;
  gpu: string;
  ram: string;
  almacenamiento: string;
  color: string | null;
  teclado: string | null;
  touchId: boolean;
};

/** Deriva tamaño/chip/cpu/gpu/ram/almacenamiento/color/teclado/Touch ID del
 *  título real (ej. "MacBook Pro 14 M5 10CPU 10GPU 16GB 1TB - Negro Espacial
 *  - Teclado Inglés"; en MacBook Neo, "Touch ID" aparece como su propio
 *  segmento, ej. "... 512GB - Touch ID - Silver"). */
function parseTitleSpecs(titulo: string): TitleDerivedSpecs | null {
  const match = titulo.match(TITLE_SPEC_RE);
  if (!match) return null;

  const [, tamano, chipGen, chipTier, cpu, gpu, ram, almacenamiento, rawTail] = match;

  const tail = rawTail.replace(/\(CTO\)/gi, "").trim();
  const segments = tail
    .split(/\s*[-/]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

  let teclado: string | null = null;
  let touchId = false;
  const colorSegments: string[] = [];
  for (const seg of segments) {
    if (KEYBOARD_HINT_RE.test(seg)) {
      teclado = normalizeKeyboardName(seg);
    } else if (TOUCH_ID_HINT_RE.test(seg)) {
      touchId = true;
    } else {
      colorSegments.push(seg);
    }
  }

  // MacBook Neo solo existe con chip A18 Pro — no hay versión "A18" a secas
  // (confirmado en apple.com/macbook-neo/specs/). Los SKUs de Odoo que traen
  // "A18" sin "Pro" en el título son un error de carga: se corrige acá para
  // que todo el sitio (selector de variantes, comparativa, badges) trate a
  // esas unidades como lo que realmente son.
  const chip = chipGen === "A18" && !chipTier ? "A18 Pro" : chipGen ? `${chipGen}${chipTier ? ` ${chipTier}` : ""}` : null;

  return {
    tamano: `${tamano}"`,
    chip,
    cpu: `${cpu} CPU`,
    gpu: `${gpu} GPU`,
    ram: `${ram}GB`,
    almacenamiento,
    color: colorSegments.length ? normalizeColorName(colorSegments.join(" ")) : null,
    teclado,
    touchId,
  };
}

/** Tipo de pantalla y batería, solo cuando la descripción real de ESE producto los
 *  menciona (frases de marketing que Odoo ya trae, ej. "pantalla Liquid Retina XDR"
 *  y "hasta 24 horas de batería") — nunca un valor supuesto para toda la línea. */
function parseDescriptionSpecs(descripcion: string): {
  tipoPantalla: string | null;
  bateria: string | null;
} {
  const flat = descripcion.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const tipoPantalla = /Liquid Retina XDR/i.test(flat) ? "Liquid Retina XDR" : null;
  const horas = flat.match(/hasta (\d+)\s*horas/i)?.[1] ?? null;
  return { tipoPantalla, bateria: horas ? `${horas} horas` : null };
}

type EffectiveSpecs = {
  chip: string | null;
  cpu: string | null;
  gpu: string | null;
  ram: string | null;
  almacenamiento: string | null;
  color: string | null;
  teclado: string | null;
  tamano: string | null;
  tipoPantalla: string | null;
  bateria: string | null;
  touchId: boolean;
};

/** Combina producto_caracteristica real (prioridad) con lo derivado de
 *  título/descripción (fallback) — ver comentario arriba. */
function effectiveSpecsFrom(
  titulo: string,
  descripcion: string,
  caracteristicas: { caracteristica: { nombre: string }; valor: string }[]
): EffectiveSpecs {
  const real = new Map(caracteristicas.map((c) => [c.caracteristica.nombre, c.valor]));
  const fromTitle = parseTitleSpecs(titulo);
  const fromDescripcion = parseDescriptionSpecs(descripcion);
  const chip = real.get("Chip") ?? fromTitle?.chip ?? null;
  // El título en Odoo trae "5GPU" para las dos variantes de MacBook Neo, pero
  // el A18 Pro real tiene GPU de 6 núcleos (vs. 5 del A18 base) — se corrige
  // acá, no en el título, para que valga en toda la UI (tile, comparativa,
  // selector de variantes) sin depender de qué texto haya en cada SKU.
  const gpuOverride = chip === "A18 Pro" ? "6 GPU" : null;
  const touchId = fromTitle?.touchId ?? false;
  return {
    chip,
    cpu: real.get("CPU") ?? fromTitle?.cpu ?? null,
    gpu: gpuOverride ?? real.get("GPU") ?? fromTitle?.gpu ?? null,
    ram: real.get("RAM") ?? fromTitle?.ram ?? null,
    almacenamiento: real.get("Almacenamiento") ?? fromTitle?.almacenamiento ?? null,
    color: real.get("Color") ?? fromTitle?.color ?? null,
    teclado: real.get("Teclado") ?? fromTitle?.teclado ?? null,
    tamano: real.get("Tamaño") ?? fromTitle?.tamano ?? null,
    tipoPantalla: real.get("Tipo de pantalla") ?? fromDescripcion.tipoPantalla ?? null,
    bateria: real.get("Batería") ?? fromDescripcion.bateria ?? null,
    touchId,
  };
}

/** Filas "característica" para la UI (spec tiles, tabla técnica, subtítulo), mezclando
 *  filas reales de producto_caracteristica con lo derivado de título/descripción para
 *  los nombres que todavía no están cargados en la base. */
export function effectiveCharacteristicRows(product: {
  titulo: string;
  descripcion: string;
  caracteristicas: { caracteristica: { nombre: string }; valor: string }[];
}): { caracteristica: { nombre: string }; valor: string }[] {
  const present = new Set(product.caracteristicas.map((c) => c.caracteristica.nombre));
  const merged = product.caracteristicas.map((c) => ({
    caracteristica: { nombre: c.caracteristica.nombre },
    valor: c.valor,
  }));

  const specs = effectiveSpecsFrom(product.titulo, product.descripcion, product.caracteristicas);
  const pushIfMissing = (nombre: string, valor: string | null) => {
    if (valor && !present.has(nombre)) merged.push({ caracteristica: { nombre }, valor });
  };
  pushIfMissing("Color", specs.color);
  pushIfMissing("Tamaño", specs.tamano);
  pushIfMissing("Tipo de pantalla", specs.tipoPantalla);
  pushIfMissing("Chip", specs.chip);
  pushIfMissing("CPU", specs.cpu);
  pushIfMissing("GPU", specs.gpu);
  pushIfMissing("RAM", specs.ram);
  pushIfMissing("Almacenamiento", specs.almacenamiento);
  pushIfMissing("Batería", specs.bateria);
  pushIfMissing("Teclado", specs.teclado);
  if (specs.touchId) pushIfMissing("Touch ID", "Sí");
  return merged;
}

export type ProductVariantOption = {
  id_producto: number;
  slug: string;
  color: string | null;
  chip: string | null;
  chipSpec: string | null;
  teclado: string | null;
  memoria: string | null;
  touchId: boolean;
  inStock: boolean;
  descripcion: string;
};

/**
 * Productos de la misma categoría y mismo Tamaño (misma "línea" — ej. MacBook Pro
 * 14"), pudiendo diferir en Chip, Color, RAM/Almacenamiento y Teclado. Usa
 * producto_caracteristica si está cargada, y si no, lo derivado del título/
 * descripción real (ver effectiveSpecsFrom) — si ninguna de las dos fuentes da el
 * Tamaño, no hay variantes que mostrar (no se inventa nada).
 */
export async function getProductVariants(product: {
  id_producto: number;
  titulo: string;
  descripcion: string;
  categorias: { id_categoria: number }[];
  caracteristicas: { caracteristica: { nombre: string }; valor: string }[];
}): Promise<ProductVariantOption[]> {
  const categoriaId = product.categorias[0]?.id_categoria;
  if (!categoriaId) return [];

  const own = effectiveSpecsFrom(product.titulo, product.descripcion, product.caracteristicas);
  if (!own.tamano) return [];

  const candidates = await prisma.producto.findMany({
    where: { activo: true, categorias: { some: { id_categoria: categoriaId } } },
    select: {
      id_producto: true,
      slug: true,
      titulo: true,
      descripcion: true,
      stocks: { include: { almacen: true } },
      caracteristicas: { include: { caracteristica: true } },
    },
  });

  const options: ProductVariantOption[] = [];
  for (const cand of candidates) {
    const specs = effectiveSpecsFrom(cand.titulo, cand.descripcion, cand.caracteristicas);
    if (specs.tamano !== own.tamano) continue;
    options.push({
      id_producto: cand.id_producto,
      slug: cand.slug,
      color: specs.color,
      chip: specs.chip,
      chipSpec: specs.cpu && specs.gpu ? `${specs.cpu} · ${specs.gpu}` : null,
      teclado: specs.teclado,
      memoria: specs.ram && specs.almacenamiento ? `${specs.ram} · ${specs.almacenamiento}` : null,
      touchId: specs.touchId,
      inStock: resolveStockAvailability(cand.stocks).inStock,
      descripcion: cand.descripcion,
    });
  }
  return options.length > 1 ? options : [];
}

/**
 * Título genérico de línea ("MacBook Pro 14"", "MacBook Neo 13""), sin chip,
 * memoria, almacenamiento, color ni teclado — para tarjetas donde se destaca
 * la línea completa (ej. Destacados) en vez de un SKU puntual. Si el título no
 * matchea una línea Mac conocida, devuelve `null` (se usa el título real tal cual).
 */
export function genericLineTitle(titulo: string): string | null {
  const m = titulo.match(/^(?:CTO\s+)?(MacBook\s+(?:Pro|Neo|Air))\s+(\d+)/i);
  return m ? `${m[1]} ${m[2]}"` : null;
}

/**
 * Odoo guarda la descripción de marketing por SKU, y varía entre colores del
 * mismo hardware: a veces está desactualizada (ej. menciona "chip M4" en un
 * producto que en realidad es M5) y a veces simplemente no tiene el formato
 * de bullets que sí tiene otro color. Como las variantes de color son el
 * mismo producto, deben mostrar la misma info con la misma presentación —
 * se usa la mejor versión disponible en la familia (con bullets y sin
 * contradecir el Chip real ya verificado). Nunca se inventa texto nuevo,
 * solo se elige cuál de las descripciones reales ya cargadas mostrar.
 */
export function pickConsistentDescription(
  own: { descripcion: string },
  siblings: ProductVariantOption[],
  chip: string | null
): string {
  const mentionsWrongChip = (text: string) => {
    if (!chip) return false;
    const flat = text.replace(/<[^>]+>/g, " ");
    const match = flat.match(/chip\s+(M\d+(?:\s+(?:Pro|Max))?)/i);
    return !!match && match[1].toLowerCase() !== chip.toLowerCase();
  };

  const pool: { descripcion: string }[] = siblings.length ? siblings : [own];

  const withBullets = pool.find(
    (s) => s.descripcion.includes("•") && !mentionsWrongChip(s.descripcion)
  );
  if (withBullets) return withBullets.descripcion;

  const consistent = pool.find((s) => !mentionsWrongChip(s.descripcion));
  return consistent?.descripcion ?? own.descripcion;
}

export type SizeComparisonRow = {
  tamano: string;
  tipoPantalla: string | null;
  chips: string;
  desde: number | null;
  /** Slug del producto real más barato de ese tamaño (para linkear el selector). */
  slugDesde: string | null;
};

const CHIP_ORDER = ["M4", "M4 Pro", "M4 Max", "M5", "M5 Pro", "M5 Max"];

// Orden fijo de colores (no alfabético ni el orden en que Prisma devuelva las
// filas): así listas de color (selector de variantes, comparativas) se ven
// siempre igual sin importar desde qué producto/consulta se arme la lista.
const COLOR_ORDER = ["Plateado", "Rosa", "Amarillo", "Índigo"];

export function sortColors(colors: string[]): string[] {
  return [...colors].sort((a, b) => {
    const ia = COLOR_ORDER.indexOf(a);
    const ib = COLOR_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

/**
 * Compara los tamaños de una línea de producto (ej. MacBook Pro 14"/16") usando
 * Tamaño/Chip reales si están cargados en producto_caracteristica, y si no, lo
 * derivado del título/descripción (ver effectiveSpecsFrom). Si ningún producto de
 * la categoría da esos datos por ninguna de las dos vías, devuelve [] (no se inventa).
 */
export async function getSizeComparison(categoriaId: number): Promise<SizeComparisonRow[]> {
  const products = await prisma.producto.findMany({
    where: { activo: true, categorias: { some: { id_categoria: categoriaId } } },
    include: {
      precios: { orderBy: { fecha_desde: "desc" } },
      caracteristicas: { include: { caracteristica: true } },
    },
  });

  const groups = new Map<
    string,
    { chips: Set<string>; tiposPantalla: Set<string>; precios: number[]; cheapestSlug: string | null; cheapestPrecio: number }
  >();

  for (const p of products) {
    const specs = effectiveSpecsFrom(p.titulo, p.descripcion, p.caracteristicas);
    const tamano = specs.tamano;
    const chip = specs.chip;
    if (!tamano || !chip) continue;

    if (!groups.has(tamano)) {
      groups.set(tamano, {
        chips: new Set(),
        tiposPantalla: new Set(),
        precios: [],
        cheapestSlug: null,
        cheapestPrecio: Infinity,
      });
    }
    const g = groups.get(tamano)!;
    g.chips.add(chip);
    if (specs.tipoPantalla) g.tiposPantalla.add(specs.tipoPantalla);
    const precio = pickCurrentPrice(p.precios);
    if (precio != null) {
      g.precios.push(precio);
      if (precio < g.cheapestPrecio) {
        g.cheapestPrecio = precio;
        g.cheapestSlug = p.slug;
      }
    }
  }

  if (groups.size < 2) return [];

  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "es", { numeric: true }))
    .map(([tamano, g]) => ({
      tamano,
      tipoPantalla: g.tiposPantalla.size === 1 ? [...g.tiposPantalla][0] : null,
      slugDesde: g.cheapestSlug,
      chips: [...g.chips]
        .sort((a, b) => CHIP_ORDER.indexOf(a) - CHIP_ORDER.indexOf(b))
        .join(" / "),
      desde: g.precios.length ? Math.min(...g.precios) : null,
    }));
}

export type ChipComparisonRow = {
  chip: string;
  cpu: string | null;
  gpu: string | null;
  colores: string[];
  almacenamientos: { valor: string; touchId: boolean }[];
  desde: number | null;
  slugDesde: string | null;
};

/**
 * Compara los chips de una línea de un solo tamaño (ej. MacBook Neo 13", que
 * viene en A18 y A18 Pro) mostrando qué colores/almacenamientos trae cada uno
 * y el precio "desde". Mismo enfoque que getSizeComparison (real primero,
 * derivado de título/descripción como fallback) — si solo hay un chip en la
 * categoría, no hay nada que comparar y devuelve [].
 */
export async function getChipComparison(categoriaId: number): Promise<ChipComparisonRow[]> {
  const products = await prisma.producto.findMany({
    where: { activo: true, categorias: { some: { id_categoria: categoriaId } } },
    include: {
      precios: { orderBy: { fecha_desde: "desc" } },
      caracteristicas: { include: { caracteristica: true } },
    },
  });

  const groups = new Map<
    string,
    {
      cpu: string | null;
      gpu: string | null;
      colores: Set<string>;
      // Almacenamiento -> ¿ese storage viene con Touch ID? (en MacBook Neo
      // Touch ID depende del teclado elegido, pero en este catálogo cada SKU
      // sincronizada trae uno solo de los dos, y coincide 1:1 con el
      // almacenamiento — se muestra igual, por SKU real, no inventado).
      almacenamientos: Map<string, boolean>;
      precios: number[];
      cheapestSlug: string | null;
      cheapestPrecio: number;
    }
  >();

  for (const p of products) {
    const specs = effectiveSpecsFrom(p.titulo, p.descripcion, p.caracteristicas);
    const chip = specs.chip;
    if (!chip) continue;

    if (!groups.has(chip)) {
      groups.set(chip, {
        cpu: specs.cpu,
        gpu: specs.gpu,
        colores: new Set(),
        almacenamientos: new Map(),
        precios: [],
        cheapestSlug: null,
        cheapestPrecio: Infinity,
      });
    }
    const g = groups.get(chip)!;
    if (specs.color) g.colores.add(specs.color);
    if (specs.almacenamiento) {
      g.almacenamientos.set(
        specs.almacenamiento,
        (g.almacenamientos.get(specs.almacenamiento) ?? false) || specs.touchId
      );
    }
    const precio = pickCurrentPrice(p.precios);
    if (precio != null) {
      g.precios.push(precio);
      if (precio < g.cheapestPrecio) {
        g.cheapestPrecio = precio;
        g.cheapestSlug = p.slug;
      }
    }
  }

  if (groups.size < 2) return [];

  return [...groups.entries()]
    .sort((a, b) => CHIP_ORDER.concat(["A18", "A18 Pro"]).indexOf(a[0]) - CHIP_ORDER.concat(["A18", "A18 Pro"]).indexOf(b[0]))
    .map(([chip, g]) => ({
      chip,
      cpu: g.cpu,
      gpu: g.gpu,
      colores: sortColors([...g.colores]),
      almacenamientos: [...g.almacenamientos.entries()]
        .sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10))
        .map(([valor, touchId]) => ({ valor, touchId })),
      slugDesde: g.cheapestSlug,
      desde: g.precios.length ? Math.min(...g.precios) : null,
    }));
}

export type StorageComparisonRow = {
  almacenamiento: string;
  touchId: boolean;
  colores: string[];
  desde: number | null;
  slugDesde: string | null;
};

/**
 * Compara los almacenamientos de una línea de un solo chip (ej. MacBook Neo,
 * que solo viene en A18 Pro: 256GB sin Touch ID vs 512GB con Touch ID),
 * mostrando qué colores están disponibles en cada uno. Mismo enfoque que
 * getChipComparison — si solo hay un almacenamiento cargado, no hay nada que
 * comparar y devuelve [].
 */
export async function getStorageComparison(categoriaId: number): Promise<StorageComparisonRow[]> {
  const products = await prisma.producto.findMany({
    where: { activo: true, categorias: { some: { id_categoria: categoriaId } } },
    include: {
      precios: { orderBy: { fecha_desde: "desc" } },
      caracteristicas: { include: { caracteristica: true } },
    },
  });

  const groups = new Map<
    string,
    {
      touchId: boolean;
      colores: Set<string>;
      precios: number[];
      cheapestSlug: string | null;
      cheapestPrecio: number;
    }
  >();

  for (const p of products) {
    const specs = effectiveSpecsFrom(p.titulo, p.descripcion, p.caracteristicas);
    const almacenamiento = specs.almacenamiento;
    if (!almacenamiento) continue;

    if (!groups.has(almacenamiento)) {
      groups.set(almacenamiento, {
        touchId: specs.touchId,
        colores: new Set(),
        precios: [],
        cheapestSlug: null,
        cheapestPrecio: Infinity,
      });
    }
    const g = groups.get(almacenamiento)!;
    if (specs.color) g.colores.add(specs.color);
    const precio = pickCurrentPrice(p.precios);
    if (precio != null) {
      g.precios.push(precio);
      if (precio < g.cheapestPrecio) {
        g.cheapestPrecio = precio;
        g.cheapestSlug = p.slug;
      }
    }
  }

  if (groups.size < 2) return [];

  return [...groups.entries()]
    .sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10))
    .map(([almacenamiento, g]) => ({
      almacenamiento,
      touchId: g.touchId,
      colores: sortColors([...g.colores]),
      slugDesde: g.cheapestSlug,
      desde: g.precios.length ? Math.min(...g.precios) : null,
    }));
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
