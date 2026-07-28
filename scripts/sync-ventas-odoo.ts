/**
 * Reprocesa ventas pagadas pendientes de sync a Odoo.
 * Uso: npm run sync:ventas
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { getOdooConfig } from "../src/lib/odoo-config";
import { syncVentaToOdoo } from "../src/lib/odoo-venta";

async function main() {
  const cfg = await getOdooConfig();
  const MAX_INTENTOS = cfg.syncMaxIntentos;
  const ventas = await prisma.venta.findMany({
    where: {
      estado: "pagada",
      odoo_sync_estado: { in: ["pendiente", "error"] },
      odoo_sync_intentos: { lt: MAX_INTENTOS },
    },
    orderBy: { id_venta: "asc" },
    take: 50,
    select: { id_venta: true, odoo_sync_estado: true },
  });

  if (!ventas.length) {
    console.log("No hay ventas pendientes de sync a Odoo.");
    return;
  }

  console.log(`Procesando ${ventas.length} venta(s)…`);
  let ok = 0;
  let err = 0;
  let skipped = 0;

  for (const v of ventas) {
    const result = await syncVentaToOdoo(v.id_venta);
    console.log(`  #${v.id_venta}: ${result}`);
    if (result === "ok") ok++;
    else if (result === "error") err++;
    else skipped++;
  }

  console.log(`Listo: ${ok} ok, ${err} error, ${skipped} omitidas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
