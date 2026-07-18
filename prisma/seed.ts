import { PrismaClient } from "@prisma/client";
import { slugify } from "../src/lib/slug";
import { ONECLICK_TIENDAS } from "../src/lib/tiendas-data";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding OneClick Store...");

  const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@oneclickstore.com").toLowerCase();

  await prisma.usuario.upsert({
    where: { mail: adminEmail },
    create: { mail: adminEmail, tipo_usuario: "admin", activo: true },
    update: { tipo_usuario: "admin", activo: true },
  });

  // Familias
  const familiaDefs = [
    { nombre: "iPhone", slug: "iphone", orden: 1 },
    { nombre: "Mac", slug: "mac", orden: 2 },
    { nombre: "iPad", slug: "ipad", orden: 3 },
    { nombre: "Apple Watch", slug: "apple-watch", orden: 4 },
    { nombre: "AirPods", slug: "airpods", orden: 5 },
  ];
  for (const f of familiaDefs) {
    const cat = await prisma.categoria.findFirst({
      where: { OR: [{ slug: f.slug }, { nombre: { contains: f.nombre } }], nivel: 1 },
    });
    await prisma.familia.upsert({
      where: { slug: f.slug },
      create: {
        nombre: f.nombre,
        slug: f.slug,
        titulo: f.nombre,
        descripcion: `Descubrí la línea ${f.nombre} en OneClick.`,
        orden: f.orden,
        id_categoria: cat?.id_categoria ?? null,
        activo: true,
      },
      update: {
        titulo: f.nombre,
        id_categoria: cat?.id_categoria ?? null,
        orden: f.orden,
      },
    });
  }

  // Tarjetas adheridas (del mapa)
  const tarjetas = [
    ["amex", "American Express", "Amex"],
    ["banco-bbva", "BBVA", "Banco BBVA"],
    ["banco-ciudad", "Banco Ciudad", "Banco Ciudad"],
    ["banco-comafi", "Comafi", "Banco Comafi"],
    ["banco-cordoba", "Banco Córdoba", "Banco Córdoba"],
    ["banco-galicia", "Galicia", "Banco Galicia"],
    ["banco-hipotecario", "Hipotecario", "Banco Hipotecario"],
    ["banco-icbc", "ICBC", "Banco ICBC"],
    ["banco-macro", "Macro", "Banco Macro"],
    ["banco-municipal", "Municipal", "Banco Municipal"],
    ["banco-nacion", "Nación", "Banco Nación"],
    ["banco-patagonia", "Patagonia", "Banco Patagonia"],
    ["banco-provincia-de-buenos-aires", "Provincia", "Banco Provincia"],
    ["banco-santa-fe", "Santa Fe", "Banco Santa Fe"],
    ["banco-santander", "Santander", "Banco Santander"],
    ["banco-supervielle", "Supervielle", "Banco Supervielle"],
    ["mastercard", "Mastercard", "Mastercard"],
    ["mercado-pago", "Mercado Pago", "Mercado Pago"],
    ["naranja", "Naranja X", "Naranja"],
    ["tc-mercadopago", "TC Mercado Pago", "Mercado Pago"],
    ["visa", "Visa", "Visa"],
  ] as const;

  for (const [slug, nombre, banco] of tarjetas) {
    await prisma.tarjeta_adherida.upsert({
      where: { slug },
      create: { nombre, slug, banco, activo: true },
      update: { nombre, banco, activo: true },
    });
  }

  // Beneficios
  const beneficios = [
    { nombre: "12 cuotas sin interés", slug: "12-cuotas-sin-interes", cuotas: 12 },
    { nombre: "12 cuotas sin interés Modo", slug: "12-cuotas-sin-interes-modo", cuotas: 12 },
    { nombre: "24 cuotas sin interés", slug: "24-cuotas-sin-interes", cuotas: 24 },
    { nombre: "9 cuotas sin interés", slug: "9-cuotas-sin-interes", cuotas: 9 },
    { nombre: "9 cuotas sin interés OC", slug: "9-cuotas-sin-interes-oc", cuotas: 9 },
  ];
  for (const b of beneficios) {
    await prisma.beneficio.upsert({
      where: { slug: b.slug },
      create: {
        nombre: b.nombre,
        slug: b.slug,
        cuotas: b.cuotas,
        descripcion: `${b.nombre} en productos seleccionados. Consultá bases y condiciones.`,
        activo: true,
      },
      update: { nombre: b.nombre, cuotas: b.cuotas, activo: true },
    });
  }

  // Link some tarjetas to beneficios (visa/master/galicia)
  const ben24 = await prisma.beneficio.findUnique({ where: { slug: "24-cuotas-sin-interes" } });
  const tarjetasLink = await prisma.tarjeta_adherida.findMany({
    where: { slug: { in: ["visa", "mastercard", "banco-galicia", "amex"] } },
  });
  if (ben24) {
    for (const t of tarjetasLink) {
      await prisma.beneficio_tarjeta.upsert({
        where: {
          id_beneficio_id_tarjeta: {
            id_beneficio: ben24.id_beneficio,
            id_tarjeta: t.id_tarjeta,
          },
        },
        create: { id_beneficio: ben24.id_beneficio, id_tarjeta: t.id_tarjeta },
        update: {},
      });
    }
  }

  // Tiendas (oneclickstore.com/contacto)
  const activeSlugs = ONECLICK_TIENDAS.map((t) => t.slug);
  for (const t of ONECLICK_TIENDAS) {
    await prisma.tienda.upsert({
      where: { slug: t.slug },
      create: { ...t, activo: true },
      update: { ...t, activo: true },
    });
  }
  await prisma.tienda.updateMany({
    where: { slug: { notIn: activeSlugs } },
    data: { activo: false },
  });

  // Banner home
  const now = new Date();
  const existingHero = await prisma.banner.findFirst({ where: { ubicacion: "hero" } });
  if (!existingHero) {
    await prisma.banner.create({
      data: {
        titulo: "Llegó tu aguinaldo — MacBook Neo al mejor precio",
        imagen_desktop: "/oneclick/hero.webp",
        imagen_mobile: "/oneclick/hero.webp",
        link: "/shop",
        ubicacion: "hero",
        orden: 1,
        vigencia_desde: now,
        vigencia_hasta: null,
        activo: true,
      },
    });
  }

  // Etiquetas web propias (además de Odoo)
  const etiquetasWeb = [
    "hasta-12-cuotas",
    "hasta-18-cuotas",
    "hasta-24-cuotas",
    "ofertas-bomba",
    "mundial",
    "hot-sale-2026",
  ];
  for (const slug of etiquetasWeb) {
    await prisma.etiqueta.upsert({
      where: { slug },
      create: { nombre: slug.replace(/-/g, " "), slug, activo: true },
      update: { activo: true },
    });
  }

  // Grupos ejemplo
  await prisma.grupo_producto.upsert({
    where: { slug: "AirPods-Pro-3" },
    create: {
      nombre: "AirPods Pro 3",
      slug: "AirPods-Pro-3",
      descripcion: "Grupo de variantes AirPods Pro 3",
      activo: true,
    },
    update: { activo: true },
  });
  await prisma.grupo_producto.upsert({
    where: { slug: "AirPods-Pro-2" },
    create: {
      nombre: "AirPods Pro 2",
      slug: "AirPods-Pro-2",
      descripcion: "Grupo de variantes AirPods Pro 2",
      activo: true,
    },
    update: { activo: true },
  });

  console.log("Seed OK", { adminEmail, slugifyDemo: slugify("One Click") });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
