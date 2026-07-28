import "dotenv/config";
import { seedOdooParametros } from "../src/lib/odoo-config";
import { prisma } from "../src/lib/prisma";

async function main() {
  await seedOdooParametros();
  console.log("Parámetros Odoo (grupo odoo) insertados/actualizados.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
