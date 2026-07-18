import { PrismaClient } from "@prisma/client";
import { ONECLICK_TIENDAS } from "../src/lib/tiendas-data";

const prisma = new PrismaClient();

async function main() {
  const activeSlugs = ONECLICK_TIENDAS.map((t) => t.slug);

  for (const t of ONECLICK_TIENDAS) {
    await prisma.tienda.upsert({
      where: { slug: t.slug },
      create: { ...t, activo: true, horarios: null },
      update: { ...t, activo: true, horarios: null },
    });
  }

  const deactivated = await prisma.tienda.updateMany({
    where: { slug: { notIn: activeSlugs } },
    data: { activo: false },
  });

  const all = await prisma.tienda.findMany({
    where: { activo: true },
    orderBy: { orden: "asc" },
  });

  console.log(
    JSON.stringify(
      {
        deactivated: deactivated.count,
        active: all.map((t) => ({
          slug: t.slug,
          nombre: t.nombre,
          direccion: t.direccion,
          codigo_postal: t.codigo_postal,
          email: t.email,
          orden: t.orden,
        })),
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
