/**
 * Sincroniza stock por almacén vendible desde Odoo (stock.quant).
 * Pensado para cron frecuente (recomendado: cada 1 min).
 * Si ya hay un sync en curso, sale con skipped=true (no solapa).
 *
 *   npm run sync:stock
 *   npm run sync:stock -- --dry-run
 */
import "dotenv/config";
import { runStockSync } from "../src/lib/odoo-sync";
import { prisma } from "../src/lib/prisma";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  console.log("Sincronizando stock por almacén desde Odoo (stock.quant)...", { dryRun });

  const stats = await runStockSync({ dryRun });
  console.log(JSON.stringify(stats, null, 2));

  if (stats.skipped) {
    console.log("Stock sync skipped (lock): already running");
    return;
  }

  if (!dryRun) {
    const stockRows = await prisma.stock.count();
    const withPositive = await prisma.stock.count({ where: { cantidad: { gt: 0 } } });
    const sample = await prisma.stock.findMany({
      take: 8,
      where: { cantidad: { gt: 0 } },
      orderBy: { cantidad: "desc" },
      include: {
        producto: { select: { slug: true, titulo: true } },
        almacen: { select: { descripcion: true } },
      },
    });
    console.log(
      JSON.stringify(
        {
          stockRows,
          withPositive,
          sample: sample.map((s) => ({
            slug: s.producto.slug,
            almacen: s.almacen.descripcion,
            cantidad: Number(s.cantidad),
            titulo: s.producto.titulo,
          })),
        },
        null,
        2
      )
    );
  }

  const realErrors = stats.errors.filter(
    (e) => !e.includes("omitido: ya hay una sincronización")
  );
  if (realErrors.length) {
    console.error(`Completed with ${realErrors.length} errors`);
    process.exitCode = 1;
  } else {
    console.log("Stock sync OK");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
