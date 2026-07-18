import "dotenv/config";
import {
  getHomeVisibleProductIds,
  syncImagesForProducts,
} from "../src/lib/odoo-sync";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  console.log("Sync imágenes de productos visibles en home...", { dryRun });

  const ids = await getHomeVisibleProductIds();
  console.log(`Productos en home: ${ids.length}`, ids);

  const result = await syncImagesForProducts({ productIds: ids, dryRun });
  console.log(JSON.stringify(result, null, 2));

  if (result.errors.length) {
    console.error(`Completado con ${result.errors.length} errores`);
    process.exitCode = 1;
  } else {
    console.log("OK — imágenes guardadas en uploads/ y DB");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
