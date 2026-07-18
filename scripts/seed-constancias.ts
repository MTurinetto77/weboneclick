import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const seed = [
  { titulo: "Legajo Impositivo 2026", categoria: "impositiva", orden: 1 },
  { titulo: "Banco Galicia", categoria: "bancaria", orden: 1 },
  { titulo: "Banco ICBC", categoria: "bancaria", orden: 2 },
];

async function main() {
  for (const c of seed) {
    const exists = await prisma.constancia_fiscal.findFirst({
      where: { titulo: c.titulo, categoria: c.categoria },
    });
    if (!exists) {
      await prisma.constancia_fiscal.create({ data: { ...c, activo: true } });
    }
  }
  console.log(JSON.stringify(await prisma.constancia_fiscal.findMany(), null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
