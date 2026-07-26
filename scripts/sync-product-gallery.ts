import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { searchRead } from "../src/lib/odoo";
import { syncProductImagesForOdooIds } from "../src/lib/odoo-sync";

/**
 * Sincroniza imagen principal + galería desde Odoo.
 *
 *   npx tsx scripts/sync-product-gallery.ts
 *   npx tsx scripts/sync-product-gallery.ts MDVH4LE/A MVX43LE/A
 */
async function main() {
  const skus = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  let odooIds: number[] = [];

  if (skus.length) {
    const products = await prisma.producto.findMany({
      where: { sku: { in: skus }, odoo_id: { not: null }, activo: true },
      select: { odoo_id: true, sku: true },
    });
    odooIds = products.map((p) => p.odoo_id!).filter(Boolean);
    console.log(
      "SKUs:",
      products.map((p) => p.sku),
      "→",
      odooIds.length,
      "productos"
    );
  } else {
    const sample = await searchRead(
      "product.product",
      [
        ["x_studio_publicado_web", "=", true],
        ["product_template_image_ids", "!=", false],
      ],
      ["id", "default_code"],
      { limit: 25, order: "id asc" }
    );
    odooIds = sample.map((r) => r.id as number);
    console.log(`Sin SKUs: sincronizando ${odooIds.length} productos con galería…`);
  }

  if (!odooIds.length) {
    console.error("No hay productos para sincronizar");
    process.exit(1);
  }

  const stats = await syncProductImagesForOdooIds(odooIds);
  console.log(JSON.stringify(stats, null, 2));
  if (stats.errors.length) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
