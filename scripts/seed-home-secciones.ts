/**
 * Pobla productos iniciales en secciones de home con la lógica previa
 * (marca/categoría) para que la home no quede vacía tras migrar.
 * Idempotente: no duplica filas ya existentes.
 *
 * Uso: npx tsx scripts/seed-home-secciones.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function linkProducts(
  id_seccion: number,
  pestana: string,
  ids: number[]
) {
  for (let i = 0; i < ids.length; i++) {
    await prisma.seccion_producto.upsert({
      where: {
        id_seccion_id_producto_pestana: {
          id_seccion,
          id_producto: ids[i]!,
          pestana,
        },
      },
      create: {
        id_seccion,
        id_producto: ids[i]!,
        pestana,
        orden: i,
      },
      update: {},
    });
  }
}

async function main() {
  const defs = [
    { clave: "destacados", nombre: "Destacados", orden: 1 },
    { clave: "fiesta", nombre: "¡Llevá la fiesta a donde quieras!", orden: 2 },
    { clave: "potencia", nombre: "Potenciá tu iPhone", orden: 3 },
  ] as const;

  for (const d of defs) {
    await prisma.seccion.upsert({
      where: { clave: d.clave },
      create: { clave: d.clave, nombre: d.nombre, activo: true, orden: d.orden },
      update: {},
    });
  }

  const secciones = await prisma.seccion.findMany();
  const byClave = new Map(secciones.map((s) => [s.clave, s]));

  const destacados = byClave.get("destacados");
  const fiesta = byClave.get("fiesta");
  const potencia = byClave.get("potencia");

  if (!destacados || !fiesta || !potencia) {
    throw new Error("No se pudieron crear las secciones fijas.");
  }

  const existingCount = await prisma.seccion_producto.count();
  if (existingCount > 0) {
    console.log(
      `Ya hay ${existingCount} productos en secciones; seed omitido (idempotente).`
    );
    return;
  }

  const { getActiveProducts } = await import("../src/lib/products");

  const [apple, jbl, accesoriosCat, fundasCat] = await Promise.all([
    prisma.marca.findFirst({ where: { slug: "apple" }, select: { id_marca: true } }),
    prisma.marca.findFirst({ where: { slug: "jbl" }, select: { id_marca: true } }),
    prisma.categoria.findFirst({
      where: { slug: "accesorios" },
      select: { id_categoria: true },
    }),
    prisma.categoria.findFirst({
      where: { slug: "accesorios-fundas-y-cobertores" },
      select: { id_categoria: true },
    }),
  ]);

  const empty = { items: [] as { id_producto: number }[] };

  const [destApple, destJbl, destAcc, potenciaProds] = await Promise.all([
    apple
      ? getActiveProducts({ marcaId: apple.id_marca, take: 8 })
      : Promise.resolve(empty),
    jbl
      ? getActiveProducts({ marcaId: jbl.id_marca, take: 8 })
      : Promise.resolve(empty),
    accesoriosCat
      ? getActiveProducts({ categoriaId: accesoriosCat.id_categoria, take: 8 })
      : Promise.resolve(empty),
    fundasCat
      ? getActiveProducts({
          categoriaId: fundasCat.id_categoria,
          q: "iPhone 17",
          take: 6,
        })
      : getActiveProducts({ q: "Funda", take: 6 }),
  ]);

  await linkProducts(
    destacados.id_seccion,
    "apple",
    destApple.items.map((p) => p.id_producto)
  );
  await linkProducts(
    destacados.id_seccion,
    "jbl",
    destJbl.items.map((p) => p.id_producto)
  );
  await linkProducts(
    destacados.id_seccion,
    "accesorios",
    destAcc.items.map((p) => p.id_producto)
  );
  await linkProducts(
    fiesta.id_seccion,
    "",
    destJbl.items.slice(0, 5).map((p) => p.id_producto)
  );
  await linkProducts(
    potencia.id_seccion,
    "",
    potenciaProds.items.map((p) => p.id_producto)
  );

  const total = await prisma.seccion_producto.count();
  console.log(`Seed home secciones OK: ${total} filas en secciones_productos`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
