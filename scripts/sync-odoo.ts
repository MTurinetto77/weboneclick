import "dotenv/config";
import { runFullSync } from "../src/lib/odoo-sync";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const skipImages = process.argv.includes("--skip-images");
  const skipStock = process.argv.includes("--skip-stock");

  console.log("OneClick Odoo sync starting...", { dryRun, skipImages, skipStock });
  const stats = await runFullSync({ dryRun, skipImages, skipStock });
  console.log(JSON.stringify(stats, null, 2));
  if (stats.errors.length) {
    console.error(`Completed with ${stats.errors.length} errors`);
    process.exitCode = 1;
  } else {
    console.log("Sync OK");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
