import { createHash } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import {
  executeKw,
  m2oId,
  readGroup,
  searchCount,
  searchRead,
  type OdooMany2One,
} from "@/lib/odoo";
import { slugify } from "@/lib/slug";

const PAGE = 200;

/** Odoo warehouse ids de sucursales mostradas en el PDP (siempre se persisten, aunque qty=0). */
const PDP_WAREHOUSE_ODOO_IDS = new Set([1, 7, 8, 9, 10, 11, 15]); // AR, ROS, PS, DOT, CS, SO, WEB

export type SyncStats = {
  categorias: { created: number; updated: number };
  almacenes: { created: number; updated: number };
  marcas: { created: number; updated: number };
  etiquetas: { created: number; updated: number };
  productos: { created: number; updated: number; deactivated: number; images: number };
  precios: { inserted: number };
  stock: { upserted: number };
  errors: string[];
  dryRun: boolean;
};

type OdooCategory = {
  id: number;
  name: string;
  parent_id: OdooMany2One;
  complete_name?: string;
};

type OdooWarehouse = {
  id: number;
  name: string;
  code: string;
};

type OdooBrand = {
  id: number;
  name: string;
};

type OdooTag = {
  id: number;
  name: string;
};

type OdooProduct = {
  id: number;
  name: string;
  display_name: string;
  default_code: string | false;
  list_price: number;
  description_sale: string | false;
  /** UI es_AR: "Descripción para comercio electrónico" */
  description_ecommerce?: string | false;
  /** UI es_AR: "Descripción para el sitio web" — HTML largo del PDP */
  website_description?: string | false;
  categ_id: OdooMany2One;
  product_tmpl_id: OdooMany2One;
  product_brand_id?: OdooMany2One;
  product_tag_ids?: number[];
  image_1920?: string | false;
  x_studio_publicado_web?: boolean;
  qty_available?: number;
  product_template_image_ids?: number[];
};

type OdooCompanyPrice = {
  id: number;
  product_tmpl_id: OdooMany2One;
  company_id: OdooMany2One;
  price: number;
};

function emptyStats(dryRun: boolean): SyncStats {
  return {
    categorias: { created: 0, updated: 0 },
    almacenes: { created: 0, updated: 0 },
    marcas: { created: 0, updated: 0 },
    etiquetas: { created: 0, updated: 0 },
    productos: { created: 0, updated: 0, deactivated: 0, images: 0 },
    precios: { inserted: 0 },
    stock: { upserted: 0 },
    errors: [],
    dryRun,
  };
}

async function ensureUniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
  suffix?: string | number
): Promise<string> {
  let candidate = slugify(base) || `item-${suffix ?? Date.now()}`;
  if (!(await exists(candidate))) return candidate;
  const withSuffix = `${candidate}-${suffix ?? "x"}`;
  if (!(await exists(withSuffix))) return withSuffix;
  let i = 2;
  while (await exists(`${withSuffix}-${i}`)) i += 1;
  return `${withSuffix}-${i}`;
}

/** HTML de descripción eCommerce desde Odoo → `producto.descripcion`. */
function pickEcommerceDescription(row: OdooProduct, fallbackTitle: string): string {
  const candidates = [row.description_ecommerce, row.website_description, row.description_sale];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return fallbackTitle;
}

/** Título de producto sin SKU (`name` de Odoo; no `display_name`). */
function pickProductTitle(row: {
  id: number;
  name?: string | false;
  display_name?: string | false;
}): string {
  const raw =
    (typeof row.name === "string" && row.name.trim()) ||
    (typeof row.display_name === "string" && row.display_name.trim()) ||
    "";
  // Por si algún registro trae el prefijo [SKU] en name
  const withoutSku = raw.replace(/^\[[^\]]+\]\s*/, "").trim();
  return withoutSku || `Producto ${row.id}`;
}

async function paginateAll<T extends Record<string, unknown>>(
  model: string,
  domain: unknown[],
  fields: string[],
  order = "id asc"
): Promise<T[]> {
  const total = await searchCount(model, domain);
  const rows: T[] = [];
  for (let offset = 0; offset < total; offset += PAGE) {
    const page = await searchRead<T>(model, domain, fields, { limit: PAGE, offset, order });
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

export async function syncCategorias(stats: SyncStats) {
  const rows = await paginateAll<OdooCategory>(
    "product.category",
    [],
    ["id", "name", "parent_id", "complete_name"]
  );

  // Parents first by sorting: those without parent, then children
  const byId = new Map(rows.map((r) => [r.id, r]));
  const depth = (id: number, seen = new Set<number>()): number => {
    if (seen.has(id)) return 0;
    seen.add(id);
    const parent = m2oId(byId.get(id)?.parent_id);
    return parent ? 1 + depth(parent, seen) : 1;
  };
  rows.sort((a, b) => depth(a.id) - depth(b.id));

  const odooToLocal = new Map<number, number>();
  for (const row of rows) {
    try {
      const existing = await prisma.categoria.findUnique({ where: { odoo_id: row.id } });
      const parentOdoo = m2oId(row.parent_id);
      const parentLocal = parentOdoo ? odooToLocal.get(parentOdoo) ?? null : null;
      // resolve parent from DB if already synced
      let id_cat_superior = parentLocal;
      if (parentOdoo && !id_cat_superior) {
        const p = await prisma.categoria.findUnique({ where: { odoo_id: parentOdoo } });
        id_cat_superior = p?.id_categoria ?? null;
      }
      const nivel = id_cat_superior
        ? ((await prisma.categoria.findUnique({ where: { id_categoria: id_cat_superior } }))
            ?.nivel ?? 0) + 1
        : 1;

      if (stats.dryRun) {
        if (existing) stats.categorias.updated += 1;
        else stats.categorias.created += 1;
        odooToLocal.set(row.id, existing?.id_categoria ?? row.id);
        continue;
      }

      if (existing) {
        await prisma.categoria.update({
          where: { id_categoria: existing.id_categoria },
          data: { nombre: row.name, nivel, id_cat_superior },
        });
        stats.categorias.updated += 1;
        odooToLocal.set(row.id, existing.id_categoria);
      } else {
        const slug = await ensureUniqueSlug(row.name, async (s) =>
          Boolean(await prisma.categoria.findUnique({ where: { slug: s } }))
        , row.id);
        const created = await prisma.categoria.create({
          data: {
            nombre: row.name,
            slug,
            nivel,
            id_cat_superior,
            odoo_id: row.id,
          },
        });
        stats.categorias.created += 1;
        odooToLocal.set(row.id, created.id_categoria);
      }
    } catch (e) {
      stats.errors.push(`categoria ${row.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return odooToLocal;
}

export async function syncAlmacenes(stats: SyncStats) {
  const rows = await paginateAll<OdooWarehouse>("stock.warehouse", [], ["id", "name", "code"]);
  for (const row of rows) {
    try {
      const existing = await prisma.almacen.findUnique({ where: { odoo_id: row.id } });
      const descripcion = row.code ? `${row.name} (${row.code})` : row.name;
      if (stats.dryRun) {
        if (existing) stats.almacenes.updated += 1;
        else stats.almacenes.created += 1;
        continue;
      }
      if (existing) {
        await prisma.almacen.update({
          where: { id_almacen: existing.id_almacen },
          data: { descripcion },
        });
        stats.almacenes.updated += 1;
      } else {
        await prisma.almacen.create({
          data: { descripcion, odoo_id: row.id },
        });
        stats.almacenes.created += 1;
      }
    } catch (e) {
      stats.errors.push(`almacen ${row.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

export async function syncMarcas(stats: SyncStats) {
  const rows = await paginateAll<OdooBrand>("product.brand", [], ["id", "name"]);
  for (const row of rows) {
    try {
      const existing = await prisma.marca.findUnique({ where: { odoo_id: row.id } });
      if (stats.dryRun) {
        if (existing) stats.marcas.updated += 1;
        else stats.marcas.created += 1;
        continue;
      }
      if (existing) {
        await prisma.marca.update({
          where: { id_marca: existing.id_marca },
          data: { nombre: row.name },
        });
        stats.marcas.updated += 1;
      } else {
        const slug = await ensureUniqueSlug(row.name, async (s) =>
          Boolean(await prisma.marca.findUnique({ where: { slug: s } }))
        , row.id);
        await prisma.marca.create({
          data: { nombre: row.name, slug, odoo_id: row.id },
        });
        stats.marcas.created += 1;
      }
    } catch (e) {
      stats.errors.push(`marca ${row.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

export async function syncEtiquetas(stats: SyncStats) {
  const rows = await paginateAll<OdooTag>("product.tag", [], ["id", "name"]);
  for (const row of rows) {
    try {
      const existing = await prisma.etiqueta.findUnique({ where: { odoo_id: row.id } });
      if (stats.dryRun) {
        if (existing) stats.etiquetas.updated += 1;
        else stats.etiquetas.created += 1;
        continue;
      }
      if (existing) {
        await prisma.etiqueta.update({
          where: { id_etiqueta: existing.id_etiqueta },
          data: { nombre: row.name },
        });
        stats.etiquetas.updated += 1;
      } else {
        const slug = await ensureUniqueSlug(row.name, async (s) =>
          Boolean(await prisma.etiqueta.findUnique({ where: { slug: s } }))
        , row.id);
        await prisma.etiqueta.create({
          data: { nombre: row.name, slug, odoo_id: row.id },
        });
        stats.etiquetas.created += 1;
      }
    } catch (e) {
      stats.errors.push(`etiqueta ${row.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

async function saveProductImage(
  folderKey: string | number,
  base64: string,
  titulo: string
): Promise<string | null> {
  try {
    const buf = Buffer.from(base64, "base64");
    const hash = createHash("md5").update(buf).digest("hex").slice(0, 10);
    const uploadsDir = process.env.UPLOADS_DIR || "uploads";
    const relDir = path.join("productos", String(folderKey));
    const absDir = path.join(process.cwd(), uploadsDir, relDir);
    await mkdir(absDir, { recursive: true });
    const filename = `${hash}.jpg`;
    await writeFile(path.join(absDir, filename), buf);
    return path.posix.join(relDir.replace(/\\/g, "/"), filename);
  } catch (e) {
    console.error(`image save failed for product ${folderKey} (${titulo}):`, e);
    return null;
  }
}

async function upsertProductImage(
  id_producto: number,
  odooId: number,
  base64: string,
  titulo: string
): Promise<boolean> {
  if (typeof base64 !== "string" || base64.length < 100) return false;
  const link = await saveProductImage(odooId, base64, titulo);
  if (!link) return false;

  const existingFile = await prisma.archivo_producto.findFirst({
    where: { id_producto, archivo: { tipo: "imagen_principal" } },
    include: { archivo: true },
  });
  if (existingFile) {
    await prisma.archivo.update({
      where: { id_archivo: existingFile.id_archivo },
      data: { link, descripcion: titulo },
    });
  } else {
    const archivo = await prisma.archivo.create({
      data: {
        link,
        tipo: "imagen_principal",
        descripcion: titulo,
      },
    });
    await prisma.archivo_producto.create({
      data: { id_archivo: archivo.id_archivo, id_producto },
    });
  }
  return true;
}

/** Reemplaza imágenes de galería (`product.image`) manteniendo la principal. */
async function replaceGalleryImages(
  id_producto: number,
  odooProductId: number,
  imageIds: number[],
  titulo: string
): Promise<number> {
  const existing = await prisma.archivo_producto.findMany({
    where: { id_producto, archivo: { tipo: "imagen_galeria" } },
    select: { id_archivo: true },
  });
  if (existing.length) {
    const ids = existing.map((e) => e.id_archivo);
    await prisma.archivo_producto.deleteMany({
      where: { id_producto, id_archivo: { in: ids } },
    });
    await prisma.archivo.deleteMany({ where: { id_archivo: { in: ids } } });
  }

  if (!imageIds.length) return 0;

  const rows = await executeKw<
    { id: number; name?: string; image_1920?: string | false; sequence?: number }[]
  >("product.image", "read", [imageIds], {
    fields: ["id", "name", "image_1920", "sequence"],
  });

  // Preservar orden de imageIds / sequence
  const byId = new Map(rows.map((r) => [r.id, r]));
  let saved = 0;
  for (const imageId of imageIds) {
    const row = byId.get(imageId);
    if (!row || typeof row.image_1920 !== "string" || row.image_1920.length < 100) continue;
    const link = await saveProductImage(
      `${odooProductId}-g${imageId}`,
      row.image_1920,
      typeof row.name === "string" ? row.name : titulo
    );
    if (!link) continue;
    const archivo = await prisma.archivo.create({
      data: {
        link,
        tipo: "imagen_galeria",
        descripcion: typeof row.name === "string" ? row.name : `${titulo} (${saved + 1})`,
      },
    });
    await prisma.archivo_producto.create({
      data: { id_archivo: archivo.id_archivo, id_producto },
    });
    saved += 1;
  }
  return saved;
}

/** Productos que se muestran hoy en la home (destacados + JBL + Potenciá). */
export async function getHomeVisibleProductIds(): Promise<number[]> {
  const [jbl, fundasCat] = await Promise.all([
    prisma.marca.findFirst({ where: { slug: "jbl" }, select: { id_marca: true } }),
    prisma.categoria.findFirst({
      where: { slug: "accesorios-fundas-y-cobertores" },
      select: { id_categoria: true },
    }),
  ]);

  const { getActiveProducts } = await import("@/lib/products");
  const [destacados, jblProducts, potencia] = await Promise.all([
    getActiveProducts({ take: 8 }),
    jbl
      ? getActiveProducts({ marcaId: jbl.id_marca, take: 5 })
      : Promise.resolve({ items: [] as { id_producto: number }[] }),
    fundasCat
      ? getActiveProducts({
          categoriaId: fundasCat.id_categoria,
          q: "iPhone 17",
          take: 6,
        })
      : getActiveProducts({ q: "Funda", take: 6 }),
  ]);

  const ids = new Set<number>();
  for (const p of [...destacados.items, ...jblProducts.items, ...potencia.items]) {
    ids.add(p.id_producto);
  }
  return [...ids];
}

/**
 * Descarga image_1920 de Odoo solo para los productos indicados (o los visibles en home).
 * Guarda en uploads/ y actualiza archivo / archivo_producto.
 */
export async function syncImagesForProducts(options?: {
  productIds?: number[];
  dryRun?: boolean;
}): Promise<{
  requested: number;
  withOdooId: number;
  downloaded: number;
  skipped: number;
  errors: string[];
}> {
  const productIds = options?.productIds ?? (await getHomeVisibleProductIds());
  const result = {
    requested: productIds.length,
    withOdooId: 0,
    downloaded: 0,
    skipped: 0,
    errors: [] as string[],
  };

  if (!productIds.length) return result;

  const products = await prisma.producto.findMany({
    where: { id_producto: { in: productIds }, odoo_id: { not: null } },
    select: { id_producto: true, odoo_id: true, titulo: true },
  });
  result.withOdooId = products.length;

  const odooIds = products.map((p) => p.odoo_id!).filter(Boolean);
  if (!odooIds.length) return result;

  // Odoo read por ids (incluye image_1920 solo de estos)
  const rows = await executeKw<
    { id: number; image_1920?: string | false; display_name?: string; name?: string }[]
  >("product.product", "read", [odooIds], {
    fields: ["id", "image_1920", "display_name", "name"],
  });

  const byOdoo = new Map(products.map((p) => [p.odoo_id!, p]));

  for (const row of rows) {
    const local = byOdoo.get(row.id);
    if (!local) continue;
    const titulo = pickProductTitle(row);

    if (typeof row.image_1920 !== "string" || row.image_1920.length < 100) {
      result.skipped += 1;
      continue;
    }

    if (options?.dryRun) {
      result.downloaded += 1;
      continue;
    }

    try {
      const ok = await upsertProductImage(
        local.id_producto,
        row.id,
        row.image_1920,
        titulo
      );
      if (ok) result.downloaded += 1;
      else result.skipped += 1;
    } catch (e) {
      result.errors.push(
        `producto ${local.id_producto} odoo=${row.id}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  return result;
}

export async function syncProductos(stats: SyncStats, options?: { skipImages?: boolean }) {
  const domain = [["x_studio_publicado_web", "=", true]];
  const fields = [
    "id",
    "name",
    "display_name",
    "default_code",
    "list_price",
    "description_sale",
    "description_ecommerce",
    "website_description",
    "categ_id",
    "product_tmpl_id",
    "product_brand_id",
    "product_tag_ids",
    "x_studio_publicado_web",
  ];
  if (!options?.skipImages) {
    fields.push("image_1920", "product_template_image_ids");
  }

  const rows = await paginateAll<OdooProduct>("product.product", domain, fields);
  const publishedOdooIds = new Set(rows.map((r) => r.id));

  // Precios por compañía (Oneclick Argentino SRL = company_id 1)
  const companyPrices = await paginateAll<OdooCompanyPrice>(
    "sk.product.price.by.company",
    [["company_id", "=", 1]],
    ["id", "product_tmpl_id", "company_id", "price"]
  );
  const priceByTmpl = new Map<number, number>();
  for (const cp of companyPrices) {
    const tmplId = m2oId(cp.product_tmpl_id);
    if (tmplId && cp.price > 0) priceByTmpl.set(tmplId, Number(cp.price));
  }

  const brands = await prisma.marca.findMany({ where: { odoo_id: { not: null } } });
  const brandByOdoo = new Map(brands.map((b) => [b.odoo_id!, b.id_marca]));
  const tags = await prisma.etiqueta.findMany({ where: { odoo_id: { not: null } } });
  const tagByOdoo = new Map(tags.map((t) => [t.odoo_id!, t.id_etiqueta]));
  const cats = await prisma.categoria.findMany({ where: { odoo_id: { not: null } } });
  const catByOdoo = new Map(cats.map((c) => [c.odoo_id!, c.id_categoria]));

  for (const row of rows) {
    try {
      const titulo = pickProductTitle(row);
      const descripcion = pickEcommerceDescription(row, titulo);
      const sku = typeof row.default_code === "string" ? row.default_code : null;
      const id_marca = brandByOdoo.get(m2oId(row.product_brand_id) ?? -1) ?? null;
      const existing = await prisma.producto.findUnique({ where: { odoo_id: row.id } });

      if (stats.dryRun) {
        if (existing) stats.productos.updated += 1;
        else stats.productos.created += 1;
        continue;
      }

      let id_producto: number;
      if (existing) {
        await prisma.producto.update({
          where: { id_producto: existing.id_producto },
          data: {
            titulo,
            descripcion,
            sku,
            id_marca,
            activo: true,
          },
        });
        id_producto = existing.id_producto;
        stats.productos.updated += 1;
      } else {
        const slug = await ensureUniqueSlug(titulo, async (s) =>
          Boolean(await prisma.producto.findUnique({ where: { slug: s } }))
        , row.id);
        const created = await prisma.producto.create({
          data: {
            titulo,
            slug,
            descripcion,
            sku,
            id_marca,
            odoo_id: row.id,
            activo: true,
          },
        });
        id_producto = created.id_producto;
        stats.productos.created += 1;
      }

      // Category link
      const categOdoo = m2oId(row.categ_id);
      if (categOdoo && catByOdoo.has(categOdoo)) {
        const id_categoria = catByOdoo.get(categOdoo)!;
        await prisma.categoria_producto.upsert({
          where: {
            id_categoria_id_producto: { id_categoria, id_producto },
          },
          create: { id_categoria, id_producto },
          update: {},
        });
      }

      // Tags
      if (Array.isArray(row.product_tag_ids)) {
        for (const tagOdoo of row.product_tag_ids) {
          const id_etiqueta = tagByOdoo.get(tagOdoo);
          if (!id_etiqueta) continue;
          await prisma.etiqueta_producto.upsert({
            where: {
              id_etiqueta_id_producto: { id_etiqueta, id_producto },
            },
            create: { id_etiqueta, id_producto },
            update: {},
          });
        }
      }

      // Price history via company prices (OneClick Argentina)
      const tmplId = m2oId(row.product_tmpl_id) ?? row.id;
      const precio =
        priceByTmpl.get(tmplId) ??
        priceByTmpl.get(row.id) ??
        (Number(row.list_price) > 0 ? Number(row.list_price) : 0);
      if (precio > 0) {
        const latest = await prisma.precio_producto.findFirst({
          where: { id_producto },
          orderBy: { fecha_desde: "desc" },
        });
        if (!latest || Number(latest.precio) !== precio) {
          await prisma.$executeRaw`
            INSERT INTO precio_producto (id_producto, fecha_desde, precio)
            VALUES (${id_producto}, CURDATE(), ${precio})
            ON DUPLICATE KEY UPDATE precio = VALUES(precio)
          `;
          stats.precios.inserted += 1;
        }
      }

      // Image principal (Odoo image_1920) + galería (product.image)
      if (!options?.skipImages) {
        if (typeof row.image_1920 === "string" && row.image_1920.length > 100) {
          const ok = await upsertProductImage(id_producto, row.id, row.image_1920, titulo);
          if (ok) stats.productos.images += 1;
        }
        const galleryIds = Array.isArray(row.product_template_image_ids)
          ? row.product_template_image_ids.filter((id): id is number => typeof id === "number")
          : [];
        try {
          const n = await replaceGalleryImages(id_producto, row.id, galleryIds, titulo);
          stats.productos.images += n;
        } catch (e) {
          stats.errors.push(
            `galeria producto ${row.id}: ${e instanceof Error ? e.message : String(e)}`
          );
        }
      }
    } catch (e) {
      stats.errors.push(`producto ${row.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Deactivate products no longer published
  if (!stats.dryRun) {
    const locals = await prisma.producto.findMany({
      where: { odoo_id: { not: null }, activo: true },
      select: { id_producto: true, odoo_id: true },
    });
    for (const p of locals) {
      if (p.odoo_id && !publishedOdooIds.has(p.odoo_id)) {
        await prisma.producto.update({
          where: { id_producto: p.id_producto },
          data: { activo: false },
        });
        stats.productos.deactivated += 1;
      }
    }
  }
}

/**
 * Llena `stock` desde `stock.quant` agrupado por almacén (warehouse_id).
 * Persiste filas por depósito con cantidad disponible (quantity − reserved).
 * Las sucursales del PDP se escriben siempre (aunque en 0) para poder mostrar cruz roja.
 */
export async function syncStock(stats: SyncStats) {
  const productos = await prisma.producto.findMany({
    where: { odoo_id: { not: null }, activo: true },
    select: { id_producto: true, odoo_id: true },
  });
  if (!productos.length) {
    stats.errors.push("stock: no hay productos con odoo_id para sincronizar");
    return;
  }

  const almacenes = await prisma.almacen.findMany({
    where: { odoo_id: { not: null } },
    select: { id_almacen: true, odoo_id: true },
  });
  const almacenByOdoo = new Map(
    almacenes
      .filter((a): a is { id_almacen: number; odoo_id: number } => a.odoo_id != null)
      .map((a) => [a.odoo_id, a.id_almacen])
  );
  if (!almacenByOdoo.size) {
    stats.errors.push("stock: no hay almacenes con odoo_id; corré sync de almacenes primero");
    return;
  }

  const productoByOdoo = new Map(productos.map((p) => [p.odoo_id!, p.id_producto]));
  const odooIds = [...productoByOdoo.keys()];

  /** productLocalId → (almacenLocalId → qty) */
  const byProduct = new Map<number, Map<number, number>>();
  for (const p of productos) byProduct.set(p.id_producto, new Map());

  for (let i = 0; i < odooIds.length; i += 80) {
    const chunk = odooIds.slice(i, i + 80);
    try {
      const groups = await readGroup(
        "stock.quant",
        [
          ["product_id", "in", chunk],
          ["location_id.usage", "=", "internal"],
          ["warehouse_id", "!=", false],
        ],
        ["quantity:sum", "reserved_quantity:sum", "product_id", "warehouse_id"],
        ["product_id", "warehouse_id"]
      );

      for (const row of groups) {
        const productOdoo = m2oId(row.product_id as OdooMany2One | false);
        const warehouseOdoo = m2oId(row.warehouse_id as OdooMany2One | false);
        if (!productOdoo || !warehouseOdoo) continue;

        const id_producto = productoByOdoo.get(productOdoo);
        const id_almacen = almacenByOdoo.get(warehouseOdoo);
        if (!id_producto || !id_almacen) continue;

        const quantity = Number(row.quantity ?? 0);
        const reserved = Number(row.reserved_quantity ?? 0);
        const available = Math.max(0, quantity - reserved);
        const map = byProduct.get(id_producto)!;
        map.set(id_almacen, (map.get(id_almacen) ?? 0) + available);
      }
    } catch (e) {
      stats.errors.push(`stock chunk ${i}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Asegurar filas 0 para sucursales PDP aunque no haya quants
  for (const p of productos) {
    const map = byProduct.get(p.id_producto)!;
    for (const odooWh of PDP_WAREHOUSE_ODOO_IDS) {
      const id_almacen = almacenByOdoo.get(odooWh);
      if (id_almacen != null && !map.has(id_almacen)) map.set(id_almacen, 0);
    }
  }

  if (stats.dryRun) {
    stats.stock.upserted = productos.length;
    return;
  }

  for (const p of productos) {
    const map = byProduct.get(p.id_producto)!;
    try {
      await prisma.stock.deleteMany({ where: { id_producto: p.id_producto } });
      const data = [...map.entries()].map(([id_almacen, cantidad]) => ({
        id_producto: p.id_producto,
        id_almacen,
        cantidad,
      }));
      if (data.length) {
        await prisma.stock.createMany({ data });
      } else {
        // Sin almacenes mapeados: marcar trackeado en 0 vía primer almacén conocido
        const fallback = [...almacenByOdoo.values()][0];
        if (fallback != null) {
          await prisma.stock.create({
            data: { id_producto: p.id_producto, id_almacen: fallback, cantidad: 0 },
          });
        }
      }
      stats.stock.upserted += 1;
    } catch (e) {
      stats.errors.push(
        `stock producto ${p.id_producto}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
}

export async function runFullSync(options?: {
  dryRun?: boolean;
  skipImages?: boolean;
  skipStock?: boolean;
}): Promise<SyncStats> {
  const stats = emptyStats(Boolean(options?.dryRun));
  await syncCategorias(stats);
  await syncAlmacenes(stats);
  await syncMarcas(stats);
  await syncEtiquetas(stats);
  await syncProductos(stats, { skipImages: options?.skipImages });
  if (!options?.skipStock) await syncStock(stats);
  return stats;
}

/** Solo sincroniza stock por almacén desde Odoo (`stock.quant`). */
export async function runStockSync(options?: { dryRun?: boolean }): Promise<SyncStats> {
  const stats = emptyStats(Boolean(options?.dryRun));
  await syncStock(stats);
  return stats;
}

/** Sincroniza imagen principal + galería para un conjunto de odoo_id de product.product. */
export async function syncProductImagesForOdooIds(
  odooIds: number[],
  options?: { dryRun?: boolean }
): Promise<{ images: number; errors: string[] }> {
  const result = { images: 0, errors: [] as string[] };
  if (!odooIds.length) return result;

  const locals = await prisma.producto.findMany({
    where: { odoo_id: { in: odooIds } },
    select: { id_producto: true, odoo_id: true },
  });
  const localByOdoo = new Map(locals.map((p) => [p.odoo_id!, p.id_producto]));

  for (let i = 0; i < odooIds.length; i += 20) {
    const chunk = odooIds.slice(i, i + 20);
    try {
      const rows = await executeKw<
        {
          id: number;
          name: string;
          image_1920?: string | false;
          product_template_image_ids?: number[];
        }[]
      >("product.product", "read", [chunk], {
        fields: ["id", "name", "image_1920", "product_template_image_ids"],
      });

      for (const row of rows) {
        const id_producto = localByOdoo.get(row.id);
        if (!id_producto) continue;
        const titulo = pickProductTitle(row);

        if (options?.dryRun) {
          result.images += 1;
          continue;
        }

        try {
          if (typeof row.image_1920 === "string" && row.image_1920.length > 100) {
            if (await upsertProductImage(id_producto, row.id, row.image_1920, titulo)) {
              result.images += 1;
            }
          }
          const galleryIds = Array.isArray(row.product_template_image_ids)
            ? row.product_template_image_ids.filter((id): id is number => typeof id === "number")
            : [];
          result.images += await replaceGalleryImages(id_producto, row.id, galleryIds, titulo);
        } catch (e) {
          result.errors.push(
            `producto ${row.id}: ${e instanceof Error ? e.message : String(e)}`
          );
        }
      }
    } catch (e) {
      result.errors.push(`chunk ${i}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return result;
}
