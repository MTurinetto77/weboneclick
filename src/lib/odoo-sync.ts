import { createHash } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { executeKw, m2oId, searchCount, searchRead, type OdooMany2One } from "@/lib/odoo";
import { slugify } from "@/lib/slug";

const PAGE = 200;

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
  categ_id: OdooMany2One;
  product_tmpl_id: OdooMany2One;
  product_brand_id?: OdooMany2One;
  product_tag_ids?: number[];
  image_1920?: string | false;
  x_studio_publicado_web?: boolean;
  qty_available?: number;
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
  odooId: number,
  base64: string,
  titulo: string
): Promise<string | null> {
  try {
    const buf = Buffer.from(base64, "base64");
    const hash = createHash("md5").update(buf).digest("hex").slice(0, 10);
    const uploadsDir = process.env.UPLOADS_DIR || "uploads";
    const relDir = path.join("productos", String(odooId));
    const absDir = path.join(process.cwd(), uploadsDir, relDir);
    await mkdir(absDir, { recursive: true });
    const filename = `${hash}.jpg`;
    await writeFile(path.join(absDir, filename), buf);
    return path.posix.join(relDir.replace(/\\/g, "/"), filename);
  } catch (e) {
    console.error(`image save failed for product ${odooId} (${titulo}):`, e);
    return null;
  }
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
    "categ_id",
    "product_tmpl_id",
    "product_brand_id",
    "product_tag_ids",
    "x_studio_publicado_web",
  ];
  if (!options?.skipImages) fields.push("image_1920");

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
      const titulo = (row.display_name || row.name || "").trim() || `Producto ${row.id}`;
      const descripcion =
        (typeof row.description_sale === "string" && row.description_sale) || titulo;
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

      // Image
      if (!options?.skipImages && typeof row.image_1920 === "string" && row.image_1920.length > 100) {
        const link = await saveProductImage(row.id, row.image_1920, titulo);
        if (link) {
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
          stats.productos.images += 1;
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

export async function syncStock(stats: SyncStats) {
  const almacenes = await prisma.almacen.findMany({ where: { odoo_id: { not: null } } });
  const almacenByOdoo = new Map(almacenes.map((a) => [a.odoo_id!, a.id_almacen]));
  const productos = await prisma.producto.findMany({
    where: { odoo_id: { not: null }, activo: true },
    select: { id_producto: true, odoo_id: true },
  });
  const productoByOdoo = new Map(productos.map((p) => [p.odoo_id!, p.id_producto]));

  if (!productoByOdoo.size || !almacenByOdoo.size) return;

  // Get stock.location ids for warehouses (stock location)
  type WhLoc = { id: number; lot_stock_id: OdooMany2One };
  const whs = await paginateAll<WhLoc>("stock.warehouse", [], ["id", "lot_stock_id"]);
  const locationToWarehouse = new Map<number, number>();
  for (const wh of whs) {
    const locId = m2oId(wh.lot_stock_id);
    if (locId && almacenByOdoo.has(wh.id)) {
      locationToWarehouse.set(locId, almacenByOdoo.get(wh.id)!);
    }
  }

  const productOdooIds = [...productoByOdoo.keys()];
  // Chunk domain for product_id in
  for (let i = 0; i < productOdooIds.length; i += 100) {
    const chunk = productOdooIds.slice(i, i + 100);
    try {
      const groups = await executeKw<
        { product_id: OdooMany2One; location_id: OdooMany2One; quantity: number }[]
      >(
        "stock.quant",
        "read_group",
        [
          [
            ["product_id", "in", chunk],
            ["location_id.usage", "=", "internal"],
          ],
          ["quantity:sum"],
          ["product_id", "location_id"],
        ],
        { lazy: false }
      );

      for (const g of groups) {
        const prodOdoo = m2oId(g.product_id);
        const locOdoo = m2oId(g.location_id);
        if (!prodOdoo || !locOdoo) continue;
        const id_producto = productoByOdoo.get(prodOdoo);
        const id_almacen = locationToWarehouse.get(locOdoo);
        if (!id_producto || !id_almacen) continue;
        const cantidad = Number(
          (g as Record<string, unknown>)["quantity"] ??
            (g as Record<string, unknown>)["quantity_sum"] ??
            0
        );
        if (stats.dryRun) {
          stats.stock.upserted += 1;
          continue;
        }
        await prisma.stock.upsert({
          where: { id_producto_id_almacen: { id_producto, id_almacen } },
          create: { id_producto, id_almacen, cantidad },
          update: { cantidad },
        });
        stats.stock.upserted += 1;
      }
    } catch (e) {
      stats.errors.push(`stock chunk ${i}: ${e instanceof Error ? e.message : String(e)}`);
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
