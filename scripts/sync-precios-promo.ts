/**
 * Sync solo de precios de lista + descuentos “Promociones Vigentes”.
 * Pensado para cron diario (mismo que POST /api/cron/sync-precios-promo).
 *
 *   npm run sync:precios-promo
 *   npm run sync:precios-promo -- --dry-run
 */
import "dotenv/config";
import { runPreciosPromoSync } from "../src/lib/odoo-sync";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  console.log("Sincronizando precios/promos desde Odoo...", { dryRun });

  const stats = await runPreciosPromoSync({ dryRun });
  console.log(JSON.stringify(stats, null, 2));

  if (stats.skipped) {
    console.warn("Sync omitido (lock)");
    process.exitCode = 0;
    return;
  }

  if (stats.errors.length) {
    console.error(`Completed with ${stats.errors.length} errors`);
    process.exitCode = 1;
  } else {
    console.log("Sync precios/promo OK");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
