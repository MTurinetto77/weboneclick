import { PrismaClient } from "@prisma/client";
import { ONECLICK_TIENDAS } from "../src/lib/tiendas-data";

const prisma = new PrismaClient();

async function main() {
  const activeSlugs = ONECLICK_TIENDAS.map((t) => t.slug);

  for (const t of ONECLICK_TIENDAS) {
    const data = {
      nombre: t.nombre,
      slug: t.slug,
      direccion: t.direccion,
      direccion_corta: t.direccion_corta,
      localidad: t.localidad,
      provincia: t.provincia,
      codigo_postal: t.codigo_postal,
      email: t.email,
      telefono: t.telefono,
      orden: t.orden,
      imagen: t.imagen,
      latitud: t.latitud,
      longitud: t.longitud,
      activo: true,
      horarios: null as string | null,
    };
    await prisma.tienda.upsert({
      where: { slug: t.slug },
      create: data,
      update: data,
    });
  }

  const deactivated = await prisma.tienda.updateMany({
    where: { slug: { notIn: activeSlugs } },
    data: { activo: false },
  });

  console.log(JSON.stringify({ deactivated: deactivated.count, count: activeSlugs.length }));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
