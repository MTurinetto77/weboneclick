import "dotenv/config";
import { runStockSync } from "../src/lib/odoo-sync";
import { prisma } from "../src/lib/prisma";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  console.log("Sincronizando stock consolidado desde Odoo (qty_available)...", { dryRun });

  const stats = await runStockSync({ dryRun });
  console.log(JSON.stringify(stats, null, 2));

  if (!dryRun) {
    const stockRows = await prisma.stock.count();
    const withPositive = await prisma.stock.count({ where: { cantidad: { gt: 0 } } });
    const sample = await prisma.stock.findMany({
      take: 5,
      orderBy: { cantidad: "desc" },
      include: { producto: { select: { slug: true, titulo: true } } },
    });
    console.log(
      JSON.stringify(
        {
          stockRows,
          withPositive,
          sample: sample.map((s) => ({
            slug: s.producto.slug,
            cantidad: Number(s.cantidad),
            titulo: s.producto.titulo,
          })),
        },
        null,
        2
      )
    );
  }

  if (stats.errors.length) {
    console.error(`Completed with ${stats.errors.length} errors`);
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
