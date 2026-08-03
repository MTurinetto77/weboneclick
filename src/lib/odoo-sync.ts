import { createHash } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { Prisma } from "@prisma/client";
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
import { withCronLock } from "@/lib/cron-lock";
import type {
  SyncBatchResult,
  SyncProductoBySkuResult,
  SyncStats,
  SyncType,
} from "@/lib/odoo-sync-types";

export type {
  SyncBatchResult,
  SyncProductoBySkuResult,
  SyncStats,
  SyncType,
} from "@/lib/odoo-sync-types";

const PAGE = 200;
const STOCK_CHUNK = 80;
const IMAGE_CHUNK = 5;

const PRODUCT_DOMAIN: unknown[] = [["x_studio_publicado_web", "=", true]];
const PRODUCT_FIELDS = [
  "id",
  "name",
  "display_name",
  "default_code",
  "list_price",
  "taxed_lst_price",
  "x_studio_installments",
  "description_sale",
  "description_ecommerce",
  "website_description",
  "categ_id",
  "product_tmpl_id",
  "product_brand_id",
  "product_tag_ids",
  "x_studio_publicado_web",
];

/** Mapeo odoo warehouse id → slug de tienda (solo para sync de almacenes). */
const TIENDA_SLUG_BY_WAREHOUSE_ODOO_ID: Record<number, string> = {
  1: "alto-rosario",
  7: "rosario-centro",
  8: "palermo-soho",
  9: "dot-baires",
  10: "cordoba-shopping",
  11: "solar-shopping",
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
  /** Precio de venta con impuestos incluidos (campo Odoo `taxed_lst_price`). */
  taxed_lst_price?: number;
  /** Límite de cuotas (Studio: "Límite de Cuotas"). Selection string p.ej. "12"|"18"|"24". */
  x_studio_installments?: string | false;
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

/** Límite de cuotas desde selection Odoo `x_studio_installments` ("12", "18", …). */
function pickCuotasMax(row: { x_studio_installments?: string | false }): number | null {
  const raw = row.x_studio_installments;
  if (typeof raw !== "string" || !raw.trim()) return null;
  const n = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
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

  const tiendaSlugs = [...new Set(Object.values(TIENDA_SLUG_BY_WAREHOUSE_ODOO_ID))];
  const tiendas = await prisma.tienda.findMany({
    where: { slug: { in: tiendaSlugs } },
    select: { id_tienda: true, slug: true },
  });
  const tiendaBySlug = new Map(tiendas.map((t) => [t.slug, t.id_tienda]));

  for (const row of rows) {
    try {
      const existing = await prisma.almacen.findUnique({ where: { odoo_id: row.id } });
      const descripcion = row.code ? `${row.name} (${row.code})` : row.name;
      const tiendaSlug = TIENDA_SLUG_BY_WAREHOUSE_ODOO_ID[row.id];
      const id_tienda = tiendaSlug ? tiendaBySlug.get(tiendaSlug) ?? null : null;
      const es_envio_domicilio = row.code === "WH";

      if (stats.dryRun) {
        if (existing) stats.almacenes.updated += 1;
        else stats.almacenes.created += 1;
        continue;
      }
      if (existing) {
        await prisma.almacen.update({
          where: { id_almacen: existing.id_almacen },
          data: { descripcion, id_tienda, es_envio_domicilio },
        });
        stats.almacenes.updated += 1;
      } else {
        await prisma.almacen.create({
          data: { descripcion, odoo_id: row.id, id_tienda, es_envio_domicilio },
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

/** Productos que se muestran hoy en la home (destacados Apple/JBL/Accesorios + JBL + Potenciá). */
export async function getHomeVisibleProductIds(): Promise<number[]> {
  const [apple, jbl, accesoriosCat, fundasCat] = await Promise.all([
    prisma.marca.findFirst({ where: { slug: "apple" }, select: { id_marca: true } }),
    prisma.marca.findFirst({ where: { slug: "jbl" }, select: { id_marca: true } }),
    prisma.categoria.findFirst({ where: { slug: "accesorios" }, select: { id_categoria: true } }),
    prisma.categoria.findFirst({
      where: { slug: "accesorios-fundas-y-cobertores" },
      select: { id_categoria: true },
    }),
  ]);

  const { getActiveProducts } = await import("@/lib/products");
  const empty = { items: [] as { id_producto: number }[] };
  const [destacadosApple, destacadosJbl, destacadosAccesorios, potencia] = await Promise.all([
    apple ? getActiveProducts({ marcaId: apple.id_marca, take: 8 }) : Promise.resolve(empty),
    jbl ? getActiveProducts({ marcaId: jbl.id_marca, take: 8 }) : Promise.resolve(empty),
    accesoriosCat
      ? getActiveProducts({ categoriaId: accesoriosCat.id_categoria, take: 8 })
      : Promise.resolve(empty),
    fundasCat
      ? getActiveProducts({
          categoriaId: fundasCat.id_categoria,
          q: "iPhone 17",
          take: 6,
        })
      : getActiveProducts({ q: "Funda", take: 6 }),
  ]);

  const ids = new Set<number>();
  for (const p of [
    ...destacadosApple.items,
    ...destacadosJbl.items,
    ...destacadosAccesorios.items,
    ...potencia.items,
  ]) {
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

async function loadCompanyPriceMap(): Promise<Map<number, number>> {
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
  return priceByTmpl;
}

async function loadProductLookupMaps() {
  const [brands, tags, cats] = await Promise.all([
    prisma.marca.findMany({ where: { odoo_id: { not: null } } }),
    prisma.etiqueta.findMany({ where: { odoo_id: { not: null } } }),
    prisma.categoria.findMany({ where: { odoo_id: { not: null } } }),
  ]);
  return {
    brandByOdoo: new Map(brands.map((b) => [b.odoo_id!, b.id_marca])),
    tagByOdoo: new Map(tags.map((t) => [t.odoo_id!, t.id_etiqueta])),
    catByOdoo: new Map(cats.map((c) => [c.odoo_id!, c.id_categoria])),
  };
}

async function upsertProductoRow(
  row: OdooProduct,
  stats: SyncStats,
  maps: {
    brandByOdoo: Map<number, number>;
    tagByOdoo: Map<number, number>;
    catByOdoo: Map<number, number>;
    priceByTmpl: Map<number, number>;
  }
): Promise<number | null> {
  const titulo = pickProductTitle(row);
  const descripcion = pickEcommerceDescription(row, titulo);
  const sku = typeof row.default_code === "string" ? row.default_code : null;
  const id_marca = maps.brandByOdoo.get(m2oId(row.product_brand_id) ?? -1) ?? null;
  const cuotas_max = pickCuotasMax(row);
  const existing = await prisma.producto.findUnique({ where: { odoo_id: row.id } });

  if (stats.dryRun) {
    if (existing) stats.productos.updated += 1;
    else stats.productos.created += 1;
    return existing?.id_producto ?? null;
  }

  let id_producto: number;
  if (existing) {
    // No reactivar: si el producto está inactivo en el sitio, el sync no lo vuelve a activar.
    await prisma.producto.update({
      where: { id_producto: existing.id_producto },
      data: { titulo, descripcion, sku, id_marca, cuotas_max },
    });
    id_producto = existing.id_producto;
    stats.productos.updated += 1;
  } else {
    const slug = await ensureUniqueSlug(
      titulo,
      async (s) => Boolean(await prisma.producto.findUnique({ where: { slug: s } })),
      row.id
    );
    const created = await prisma.producto.create({
      data: {
        titulo,
        slug,
        descripcion,
        sku,
        id_marca,
        cuotas_max,
        odoo_id: row.id,
        activo: true,
      },
    });
    id_producto = created.id_producto;
    stats.productos.created += 1;
  }

  const categOdoo = m2oId(row.categ_id);
  if (categOdoo && maps.catByOdoo.has(categOdoo)) {
    const id_categoria = maps.catByOdoo.get(categOdoo)!;
    await prisma.categoria_producto.upsert({
      where: { id_categoria_id_producto: { id_categoria, id_producto } },
      create: { id_categoria, id_producto },
      update: {},
    });
  }

  if (Array.isArray(row.product_tag_ids)) {
    for (const tagOdoo of row.product_tag_ids) {
      const id_etiqueta = maps.tagByOdoo.get(tagOdoo);
      if (!id_etiqueta) continue;
      await prisma.etiqueta_producto.upsert({
        where: { id_etiqueta_id_producto: { id_etiqueta, id_producto } },
        create: { id_etiqueta, id_producto },
        update: {},
      });
    }
  }

  const tmplId = m2oId(row.product_tmpl_id) ?? row.id;
  // Precio web = bruto (IVA incluido). Campo Odoo: taxed_lst_price
  // ("(= $ X impuestos incluidos)"). price/list_price son netos.
  const taxed =
    typeof row.taxed_lst_price === "number" && row.taxed_lst_price > 0
      ? Number(row.taxed_lst_price)
      : 0;
  const companyNet =
    maps.priceByTmpl.get(tmplId) ?? maps.priceByTmpl.get(row.id) ?? 0;
  const listNet = Number(row.list_price) > 0 ? Number(row.list_price) : 0;
  let precio = taxed;
  if (
    precio > 0 &&
    companyNet > 0 &&
    listNet > 0 &&
    Math.abs(companyNet - listNet) >= 0.02
  ) {
    // Precio por compañía distinto del list_price: escalar el bruto.
    precio = Math.round(((companyNet * taxed) / listNet) * 100) / 100;
  } else if (!precio) {
    precio = companyNet || listNet;
  }
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

  return id_producto;
}

async function deactivateUnpublishedProducts(stats: SyncStats) {
  if (stats.dryRun) return;
  const publishedRows = await paginateAll<{ id: number }>(
    "product.product",
    PRODUCT_DOMAIN,
    ["id"]
  );
  const publishedOdooIds = new Set(publishedRows.map((r) => r.id));
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

/**
 * Lote de productos: en offset 0 sincroniza maestro (categorías, almacenes, marcas, etiquetas).
 * Luego páginas de productos + precios. En el último lote desactiva no publicados. Sin imágenes.
 */
export async function runProductosSyncBatch(options?: {
  offset?: number;
  dryRun?: boolean;
  stats?: SyncStats;
}): Promise<SyncBatchResult> {
  const offset = Math.max(0, options?.offset ?? 0);
  const stats = options?.stats ?? emptyStats(Boolean(options?.dryRun));
  stats.dryRun = Boolean(options?.dryRun ?? stats.dryRun);

  let message: string | undefined;

  if (offset === 0) {
    message = "Sincronizando categorías, almacenes, marcas y etiquetas…";
    await syncCategorias(stats);
    await syncAlmacenes(stats);
    await syncMarcas(stats);
    await syncEtiquetas(stats);
  }

  const total = await searchCount("product.product", PRODUCT_DOMAIN);
  if (total === 0) {
    return {
      type: "productos",
      processed: 0,
      total: 0,
      done: true,
      nextOffset: 0,
      message: "No hay productos publicados web en Odoo",
      stats,
      errors: stats.errors,
    };
  }

  const [priceByTmpl, maps] = await Promise.all([
    loadCompanyPriceMap(),
    loadProductLookupMaps(),
  ]);

  // No incluir image_1920 en search_read masivo: 200 imágenes base64 tumba el socket del proxy.
  const rows = await searchRead<OdooProduct>("product.product", PRODUCT_DOMAIN, PRODUCT_FIELDS, {
    limit: PAGE,
    offset,
    order: "id asc",
  });

  message = `Sincronizando productos ${offset + 1}–${Math.min(offset + rows.length, total)} de ${total}…`;

  for (const row of rows) {
    try {
      await upsertProductoRow(row, stats, { ...maps, priceByTmpl });
    } catch (e) {
      stats.errors.push(`producto ${row.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const processed = offset + rows.length;
  const done = processed >= total || rows.length < PAGE;
  const nextOffset = processed;

  if (done) {
    message = "Desactivando productos no publicados…";
    await deactivateUnpublishedProducts(stats);
    message = "Productos y precios sincronizados";
  }

  return {
    type: "productos",
    processed: Math.min(processed, total),
    total,
    done,
    nextOffset,
    message,
    stats,
    errors: stats.errors,
  };
}

/** Sync completo de productos/precios/maestro (cron / CLI). Sin imágenes ni stock. */
export async function runProductosSync(options?: { dryRun?: boolean }): Promise<SyncStats> {
  const stats = emptyStats(Boolean(options?.dryRun));
  let offset = 0;
  for (;;) {
    const batch = await runProductosSyncBatch({ offset, dryRun: options?.dryRun, stats });
    if (batch.done) break;
    offset = batch.nextOffset;
  }
  return stats;
}

export async function syncProductos(stats: SyncStats, options?: { skipImages?: boolean }) {
  let offset = 0;
  for (;;) {
    const batch = await runProductosSyncBatch({
      offset,
      dryRun: stats.dryRun,
      stats,
    });
    if (batch.done) break;
    offset = batch.nextOffset;
  }

  if (!options?.skipImages) {
    const locals = await prisma.producto.findMany({
      where: { odoo_id: { not: null }, activo: true },
      select: { odoo_id: true },
    });
    const odooIds = locals.map((p) => p.odoo_id!).filter(Boolean);
    if (odooIds.length) {
      const img = await syncProductImagesForOdooIds(odooIds, { dryRun: stats.dryRun });
      stats.productos.images += img.images;
      stats.errors.push(...img.errors);
    }
  }
}

/** Stock desde Odoo para un subconjunto de productos locales con odoo_id. */
async function syncStockForProducts(
  productos: { id_producto: number; odoo_id: number }[],
  stats: SyncStats,
  options?: { chunkLabel?: string }
) {
  if (!productos.length) return;

  /** Solo almacenes vendibles en la web (retiro con tienda o envío a domicilio). */
  const sellableAlmacenes = await prisma.almacen.findMany({
    where: {
      odoo_id: { not: null },
      OR: [{ id_tienda: { not: null } }, { es_envio_domicilio: true }],
    },
    select: { id_almacen: true, odoo_id: true },
  });
  const almacenByOdoo = new Map(
    sellableAlmacenes
      .filter((a): a is { id_almacen: number; odoo_id: number } => a.odoo_id != null)
      .map((a) => [a.odoo_id, a.id_almacen])
  );
  const sellableAlmacenIds = [...new Set(almacenByOdoo.values())];
  const sellableWarehouseOdooIds = [...almacenByOdoo.keys()];
  const label = options?.chunkLabel ?? "stock";

  if (!sellableWarehouseOdooIds.length) {
    stats.errors.push(
      "stock: no hay almacenes vendibles con odoo_id (id_tienda o es_envio_domicilio)"
    );
    return;
  }

  const productoByOdoo = new Map(productos.map((p) => [p.odoo_id, p.id_producto]));
  const odooIds = [...productoByOdoo.keys()];

  /** productLocalId → (almacenLocalId → qty) */
  const byProduct = new Map<number, Map<number, number>>();
  for (const p of productos) byProduct.set(p.id_producto, new Map());

  try {
    const groups = await readGroup(
      "stock.quant",
      [
        ["product_id", "in", odooIds],
        ["location_id.usage", "=", "internal"],
        ["warehouse_id", "in", sellableWarehouseOdooIds],
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
    stats.errors.push(`${label}: ${e instanceof Error ? e.message : String(e)}`);
    return;
  }

  // Garantizar fila (qty 0) en cada almacén vendible para que el PDP no asuma "sin sync".
  for (const p of productos) {
    const map = byProduct.get(p.id_producto)!;
    for (const id_almacen of sellableAlmacenIds) {
      if (!map.has(id_almacen)) map.set(id_almacen, 0);
    }
  }

  if (!stats.dryRun) {
    const productIds = productos.map((p) => p.id_producto);
    const rows: { id_producto: number; id_almacen: number; cantidad: number }[] = [];
    for (const p of productos) {
      const map = byProduct.get(p.id_producto)!;
      for (const [id_almacen, cantidad] of map.entries()) {
        rows.push({ id_producto: p.id_producto, id_almacen, cantidad });
      }
    }

    try {
      if (rows.length) {
        const values = rows.map(
          (r) =>
            Prisma.sql`(${r.id_producto}, ${r.id_almacen}, ${r.cantidad})`
        );
        await prisma.$executeRaw`
          INSERT INTO stock (id_producto, id_almacen, cantidad)
          VALUES ${Prisma.join(values)}
          ON DUPLICATE KEY UPDATE cantidad = VALUES(cantidad)
        `;
      }

      // Quitar filas de almacenes no vendibles (deja de mostrar Corp/etc. stale en admin).
      await prisma.stock.deleteMany({
        where: {
          id_producto: { in: productIds },
          id_almacen: { notIn: sellableAlmacenIds },
        },
      });

      stats.stock.upserted += productos.length;
    } catch (e) {
      stats.errors.push(`${label} persist: ${e instanceof Error ? e.message : String(e)}`);
    }
  } else {
    stats.stock.upserted += productos.length;
  }
}

/**
 * Lote de stock: chunk de productos, read_group (solo almacenes vendibles) + upsert.
 */
export async function runStockSyncBatch(options?: {
  offset?: number;
  dryRun?: boolean;
  stats?: SyncStats;
}): Promise<SyncBatchResult> {
  const offset = Math.max(0, options?.offset ?? 0);
  const stats = options?.stats ?? emptyStats(Boolean(options?.dryRun));
  stats.dryRun = Boolean(options?.dryRun ?? stats.dryRun);

  const productos = await prisma.producto.findMany({
    where: { odoo_id: { not: null }, activo: true },
    select: { id_producto: true, odoo_id: true },
    orderBy: { id_producto: "asc" },
  });

  if (!productos.length) {
    stats.errors.push("stock: no hay productos con odoo_id para sincronizar");
    return {
      type: "stock",
      processed: 0,
      total: 0,
      done: true,
      nextOffset: 0,
      message: "No hay productos con odoo_id",
      stats,
      errors: stats.errors,
    };
  }

  const sellableCount = await prisma.almacen.count({
    where: {
      odoo_id: { not: null },
      OR: [{ id_tienda: { not: null } }, { es_envio_domicilio: true }],
    },
  });
  if (!sellableCount) {
    stats.errors.push(
      "stock: no hay almacenes vendibles con odoo_id (id_tienda o es_envio_domicilio)"
    );
    return {
      type: "stock",
      processed: 0,
      total: productos.length,
      done: true,
      nextOffset: 0,
      message: "Faltan almacenes vendibles sincronizados",
      stats,
      errors: stats.errors,
    };
  }

  const total = productos.length;
  const chunk = productos
    .slice(offset, offset + STOCK_CHUNK)
    .filter((p): p is { id_producto: number; odoo_id: number } => p.odoo_id != null);

  await syncStockForProducts(chunk, stats, { chunkLabel: `stock chunk ${offset}` });

  const processed = Math.min(offset + chunk.length, total);
  const done = processed >= total;
  return {
    type: "stock",
    processed,
    total,
    done,
    nextOffset: processed,
    message: done
      ? "Stock sincronizado"
      : `Sincronizando stock ${offset + 1}–${processed} de ${total}…`,
    stats,
    errors: stats.errors,
  };
}

/**
 * Llena `stock` desde `stock.quant` agrupado por almacén vendible (warehouse_id).
 * Persiste con upsert (quantity − reserved); no borra filas vendibles a mitad de sync.
 */
export async function syncStock(stats: SyncStats) {
  let offset = 0;
  for (;;) {
    const batch = await runStockSyncBatch({ offset, dryRun: stats.dryRun, stats });
    if (batch.done) break;
    offset = batch.nextOffset;
  }
}

export async function runFullSync(options?: {
  dryRun?: boolean;
  skipImages?: boolean;
  skipStock?: boolean;
}): Promise<SyncStats> {
  const stats = await runProductosSync({ dryRun: options?.dryRun });
  if (!options?.skipImages) {
    let offset = 0;
    for (;;) {
      const batch = await runImagesSyncBatch({ offset, dryRun: options?.dryRun, stats });
      if (batch.done) break;
      offset = batch.nextOffset;
    }
  }
  if (!options?.skipStock) {
    const locked = await withCronLock("sync-stock", async () => {
      await syncStock(stats);
    });
    if (!locked.acquired) {
      stats.skipped = true;
      stats.errors.push("stock sync omitido: ya hay una sincronización en curso");
    }
  }
  return stats;
}

/** Solo sincroniza stock por almacén desde Odoo (`stock.quant`). Para cron/CLI. */
export async function runStockSync(options?: { dryRun?: boolean }): Promise<SyncStats> {
  const stats = emptyStats(Boolean(options?.dryRun));
  const locked = await withCronLock("sync-stock", async () => {
    await syncStock(stats);
  });
  if (!locked.acquired) {
    stats.skipped = true;
    stats.errors.push("stock sync omitido: ya hay una sincronización en curso");
  }
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

  for (let i = 0; i < odooIds.length; i += IMAGE_CHUNK) {
    const chunk = odooIds.slice(i, i + IMAGE_CHUNK);
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

/**
 * Lote de imágenes (principal + galería) sobre productos activos locales.
 */
export async function runImagesSyncBatch(options?: {
  offset?: number;
  dryRun?: boolean;
  stats?: SyncStats;
}): Promise<SyncBatchResult> {
  const offset = Math.max(0, options?.offset ?? 0);
  const stats = options?.stats ?? emptyStats(Boolean(options?.dryRun));
  stats.dryRun = Boolean(options?.dryRun ?? stats.dryRun);

  const products = await prisma.producto.findMany({
    where: { odoo_id: { not: null }, activo: true },
    select: { odoo_id: true },
    orderBy: { id_producto: "asc" },
  });
  const odooIds = products.map((p) => p.odoo_id!).filter(Boolean);
  const total = odooIds.length;

  if (!total) {
    return {
      type: "imagenes",
      processed: 0,
      total: 0,
      done: true,
      nextOffset: 0,
      message: "No hay productos activos con odoo_id",
      stats,
      errors: stats.errors,
    };
  }

  const chunk = odooIds.slice(offset, offset + IMAGE_CHUNK);
  const img = await syncProductImagesForOdooIds(chunk, { dryRun: stats.dryRun });
  stats.productos.images += img.images;
  stats.errors.push(...img.errors);

  const processed = Math.min(offset + chunk.length, total);
  const done = processed >= total;
  return {
    type: "imagenes",
    processed,
    total,
    done,
    nextOffset: processed,
    message: done
      ? "Imágenes sincronizadas"
      : `Sincronizando imágenes ${offset + 1}–${processed} de ${total}…`,
    stats,
    errors: stats.errors,
  };
}

/**
 * Sincroniza un producto por SKU (default_code Odoo): datos/precios, stock e imágenes.
 * No exige `x_studio_publicado_web` para permitir forzar sync desde admin.
 */
export async function syncProductoBySku(
  rawSku: string,
  options?: { dryRun?: boolean }
): Promise<SyncProductoBySkuResult> {
  const sku = rawSku.trim();
  const stats = emptyStats(Boolean(options?.dryRun));

  if (!sku) {
    return {
      ok: false,
      sku,
      message: "Ingresá un SKU",
      stats,
      errors: ["SKU vacío"],
    };
  }

  const rows = await searchRead<OdooProduct>(
    "product.product",
    [["default_code", "=", sku]],
    PRODUCT_FIELDS,
    { limit: 5, order: "id asc" }
  );

  if (!rows.length) {
    return {
      ok: false,
      sku,
      message: `No se encontró el SKU "${sku}" en Odoo`,
      stats,
      errors: [`SKU no encontrado en Odoo: ${sku}`],
    };
  }

  if (rows.length > 1) {
    stats.errors.push(
      `Hay ${rows.length} variantes con SKU "${sku}" en Odoo; se sincroniza odoo_id=${rows[0].id}`
    );
  }

  const row = rows[0];
  const titulo = pickProductTitle(row);

  try {
    const [priceByTmpl, maps] = await Promise.all([
      loadCompanyPriceMap(),
      loadProductLookupMaps(),
    ]);
    const id_producto = await upsertProductoRow(row, stats, { ...maps, priceByTmpl });

    if (!id_producto && !stats.dryRun) {
      return {
        ok: false,
        sku,
        odoo_id: row.id,
        titulo,
        message: "No se pudo crear/actualizar el producto local",
        stats,
        errors: stats.errors,
      };
    }

    const localId =
      id_producto ??
      (await prisma.producto.findUnique({ where: { odoo_id: row.id } }))?.id_producto;

    if (localId) {
      await syncStockForProducts(
        [{ id_producto: localId, odoo_id: row.id }],
        stats,
        { chunkLabel: `stock sku ${sku}` }
      );

      const img = await syncProductImagesForOdooIds([row.id], { dryRun: stats.dryRun });
      stats.productos.images += img.images;
      stats.errors.push(...img.errors);
    }

    return {
      ok: Boolean(localId),
      sku,
      id_producto: localId ?? undefined,
      odoo_id: row.id,
      titulo,
      message: localId
        ? stats.errors.filter((e) => !e.includes("variantes con SKU")).length
          ? `Producto "${titulo}" sincronizado con advertencias`
          : `Producto "${titulo}" sincronizado (datos, stock e imágenes)`
        : `Error al sincronizar SKU "${sku}"`,
      stats,
      errors: stats.errors,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    stats.errors.push(msg);
    return {
      ok: false,
      sku,
      odoo_id: row.id,
      titulo,
      message: `Error al sincronizar SKU "${sku}"`,
      stats,
      errors: stats.errors,
    };
  }
}

/** Dispatch de un lote según tipo (API admin). */
export async function runSyncBatch(options: {
  type: SyncType;
  offset?: number;
  dryRun?: boolean;
}): Promise<SyncBatchResult> {
  switch (options.type) {
    case "productos":
      return runProductosSyncBatch({ offset: options.offset, dryRun: options.dryRun });
    case "stock":
      return runStockSyncBatch({ offset: options.offset, dryRun: options.dryRun });
    case "imagenes":
      return runImagesSyncBatch({ offset: options.offset, dryRun: options.dryRun });
    default:
      throw new Error(`Tipo de sync desconocido: ${options.type as string}`);
  }
}
