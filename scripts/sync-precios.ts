/**
 * Sync de productos + precios + maestro (categorías, almacenes, marcas, etiquetas) + desactivaciones.
 * Pensado para cron diario/semanal. Sin imágenes ni stock.
 *
 *   npm run sync:precios
 *   npm run sync:precios -- --dry-run
 */
import "dotenv/config";
import { runProductosSync } from "../src/lib/odoo-sync";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  console.log("Sincronizando productos/precios desde Odoo...", { dryRun });

  const stats = await runProductosSync({ dryRun });
  console.log(JSON.stringify(stats, null, 2));

  if (stats.errors.length) {
    console.error(`Completed with ${stats.errors.length} errors`);
    process.exitCode = 1;
  } else {
    console.log("Sync precios/productos OK");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
