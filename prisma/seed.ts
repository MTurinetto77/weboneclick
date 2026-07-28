import { PrismaClient } from "@prisma/client";
import { slugify } from "../src/lib/slug";
import { ONECLICK_TIENDAS } from "../src/lib/tiendas-data";
import { PROMOCIONES_BANCARIAS } from "../src/lib/promos-bancarias";

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

  // Beneficios (promos bancarias)
  for (const b of PROMOCIONES_BANCARIAS) {
    await prisma.beneficio.upsert({
      where: { slug: b.slug },
      create: {
        nombre: b.titulo,
        slug: b.slug,
        cuotas: b.cuotas,
        descripcion: `${b.detalles ?? ""}\n\nDisponible en: ${b.disponibleEn}\n\n${b.legales ?? ""}`.trim(),
        vigencia_desde: new Date(b.vigenciaDesde),
        vigencia_hasta: new Date(b.vigenciaHasta),
        activo: true,
      },
      update: {
        nombre: b.titulo,
        cuotas: b.cuotas,
        descripcion: `${b.detalles ?? ""}\n\nDisponible en: ${b.disponibleEn}\n\n${b.legales ?? ""}`.trim(),
        vigencia_desde: new Date(b.vigenciaDesde),
        vigencia_hasta: new Date(b.vigenciaHasta),
        activo: true,
      },
    });
  }

  // Link visa/mastercard a todos los beneficios
  const tarjetasLink = await prisma.tarjeta_adherida.findMany({
    where: { slug: { in: ["visa", "mastercard"] } },
  });
  const allBeneficios = await prisma.beneficio.findMany({
    where: { slug: { in: PROMOCIONES_BANCARIAS.map((p) => p.slug) } },
  });
  for (const ben of allBeneficios) {
    for (const t of tarjetasLink) {
      await prisma.beneficio_tarjeta.upsert({
        where: {
          id_beneficio_id_tarjeta: {
            id_beneficio: ben.id_beneficio,
            id_tarjeta: t.id_tarjeta,
          },
        },
        create: { id_beneficio: ben.id_beneficio, id_tarjeta: t.id_tarjeta },
        update: {},
      });
    }
  }

  // Tiendas (oneclickstore.com/contacto)
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
    };
    await prisma.tienda.upsert({
      where: { slug: t.slug },
      create: data,
      update: data,
    });
  }
  await prisma.tienda.updateMany({
    where: { slug: { notIn: activeSlugs } },
    data: { activo: false },
  });

  // Banners de la home (hero, secundario, triple×3, pie)
  const now = new Date();
  const homeBanners: Array<{
    titulo: string;
    imagen_desktop: string;
    imagen_mobile?: string | null;
    link?: string | null;
    ubicacion: string;
    orden: number;
    html: string;
    clase_css?: string | null;
  }> = [
    {
      titulo: "Vacaciones de invierno — Regalo desde $750.000",
      imagen_desktop: "/oneclick/hero-invierno-dsk.webp",
      imagen_mobile: "/oneclick/hero-invierno-mb.webp",
      link: "/",
      ubicacion: "hero",
      orden: 1,
      html: `<div class="oc-hero-live-copy">
  <img class="oc-hero-pill-img" src="/oneclick/pill-invierno.webp" alt="Vacaciones de invierno" />
  <p class="oc-hero-kicker">COMPRANDO DESDE</p>
  <div class="oc-price-box">
    <strong>$ 750.000</strong>
  </div>
  <h1>O MÁS, TE LLEVÁS UN <em>JUGUETE DITOYS O UN</em><br /><em>MAZO DE CARTAS de la selección</em> DE REGALO.</h1>
  <a href="/" class="oc-hero-cta-link">Conocé los productos →</a>
  <p class="oc-hero-foot">Regalá más que tecnología.<br />Regalá momentos para disfrutar estas vacaciones.</p>
</div>`,
    },
    {
      titulo: "¡El mundial ya está acá!",
      imagen_desktop: "/oneclick/scraped/home-08.webp",
      link: "/promo/mundial",
      ubicacion: "secundario",
      orden: 1,
      html: `<div class="oc-mundial-copy">
  <div class="oc-mundial-stars" aria-hidden="true">
    <img src="/oneclick/mundial-stars.png" alt="" />
  </div>
  <h2>¡El mundial ya está acá!</h2>
</div>
<div class="oc-mundial-aside">
  <p>Disfrutalo con precios especiales</p>
  <a href="/promo/mundial" class="oc-btn oc-btn-red oc-mundial-cta">Ver productos</a>
</div>`,
    },
    {
      titulo: "Tu nuevo iPhone viene con regalo (Mophie)",
      imagen_desktop: "/oneclick/promos/media-iphone-mophie.webp",
      link: "/iphone",
      ubicacion: "triple",
      orden: 1,
      clase_css: "oc-promo-dark",
      html: `<img class="oc-promo-brand" src="/oneclick/promos/mophie-logo.png" alt="mophie" />
<div class="oc-promo-copy">
  <h3>Tu nuevo iPhone viene con regalo.</h3>
  <p>Con la compra de cualquier iPhone, llevate de regalo un cargador Mophie de 30W.</p>
  <a href="/iphone" class="oc-btn oc-btn-red">¡Comprar ahora!</a>
</div>
<img class="oc-promo-media" src="/oneclick/promos/media-iphone-mophie.webp" alt="iPhone naranja con cargador Mophie 30W" />`,
    },
    {
      titulo: "¿Buscás experiencia personalizada?",
      imagen_desktop: "/oneclick/promos/media-experiencia.webp",
      link: "https://wa.me/5491100000000",
      ubicacion: "triple",
      orden: 2,
      clase_css: "oc-promo-light",
      html: `<div class="oc-promo-copy">
  <h3>¿Buscás experiencia personalizada?</h3>
  <p>Hablá con nuestros asesores y encontrá la compra perfecta para vos.</p>
  <a href="https://wa.me/5491100000000" class="oc-btn oc-btn-red oc-btn-wa" target="_blank" rel="noreferrer">
    <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16">
      <path fill="currentColor" d="M12.04 2C6.58 2 2.15 6.4 2.15 11.84c0 1.96.52 3.88 1.5 5.57L2 22l4.75-1.55a9.9 9.9 0 0 0 5.29 1.51h.01c5.46 0 9.89-4.4 9.89-9.84C21.94 6.4 17.5 2 12.04 2zm5.76 14.15c-.24.68-1.4 1.25-1.93 1.33-.5.08-1.12.11-1.81-.11-.42-.14-.95-.31-1.64-.6-2.89-1.25-4.77-4.16-4.92-4.35-.14-.19-1.2-1.6-1.2-3.05 0-1.45.76-2.16 1.03-2.45.27-.29.59-.36.79-.36h.57c.18 0 .42-.07.66.5.24.58.82 2 .89 2.15.07.15.12.32.02.52-.1.19-.15.32-.3.49-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.29.76 1.25 1.63 2.03 1.12 1 2.07 1.31 2.36 1.46.29.15.46.12.63-.07.17-.19.73-.85.93-1.14.2-.29.39-.24.66-.14.27.1 1.71.8 2 .95.29.15.49.22.56.34.07.12.07.7-.17 1.38z"/>
    </svg>
    Contactate
  </a>
</div>
<img class="oc-promo-media oc-promo-media-cover" src="/oneclick/promos/media-experiencia.webp" alt="Asesoramiento personalizado en tienda" />`,
    },
    {
      titulo: "¿Tenés un problema con tu iPhone 17?",
      imagen_desktop: "/oneclick/promos/media-servicio.webp",
      link: "/servicio-tecnico",
      ubicacion: "triple",
      orden: 3,
      clase_css: "oc-promo-light",
      html: `<div class="oc-promo-copy">
  <h3>¿Tenés un problema con tu iPhone 17?</h3>
  <p>Servicio Técnico Autorizado</p>
  <a href="/servicio-tecnico" class="oc-btn oc-btn-red">Contactate</a>
</div>
<img class="oc-promo-media oc-promo-media-phones" src="/oneclick/promos/media-servicio.webp" alt="iPhone 17 cámara" />`,
    },
    {
      titulo: "Protección Premium para tu nuevo iPhone 17",
      imagen_desktop: "/oneclick/promos/zagg-banner-bg.jpg",
      link: "/marca/zagg",
      ubicacion: "pie",
      orden: 1,
      html: `<img class="oc-zagg-logo" src="/oneclick/promos/zagg-logo.png" alt="ZAGG" />
<div class="oc-zagg-copy">
  <h2>Protección Premium<br />para tu nuevo iPhone 17</h2>
  <a href="/marca/zagg" class="oc-btn oc-btn-red">Ver Productos</a>
</div>
<img class="oc-zagg-badge" src="/oneclick/promos/zagg-badge.png" alt="La Marca #1 del Mundo en Protección Móvil" />`,
    },
  ];

  for (const b of homeBanners) {
    const existing = await prisma.banner.findFirst({
      where: { ubicacion: b.ubicacion, orden: b.orden },
    });
    const data = {
      titulo: b.titulo,
      imagen_desktop: b.imagen_desktop,
      imagen_mobile: b.imagen_mobile ?? null,
      link: b.link ?? null,
      ubicacion: b.ubicacion,
      orden: b.orden,
      vigencia_desde: now,
      vigencia_hasta: null,
      activo: true,
      html: b.html,
      clase_css: b.clase_css ?? null,
    };
    if (!existing) {
      await prisma.banner.create({ data });
    } else if (!existing.html || b.ubicacion === "hero") {
      // Hero se actualiza siempre en seed; otros solo si aún no tienen HTML
      await prisma.banner.update({
        where: { id_banner: existing.id_banner },
        data,
      });
    }
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

  // Promociones del menú (asociaciones categorías/productos se configuran en admin)
  const promocionesSeed = [
    {
      nombre: "Vacaciones de Invierno",
      subtitulo: "Promo!",
      icono: "❄️",
      slug: "vacaciones-de-invierno",
      prioridad: 10,
    },
    {
      nombre: "BOMBA",
      subtitulo: "Ofertas",
      icono: "💣",
      slug: "ofertas-bomba",
      prioridad: 20,
    },
    {
      nombre: "Ofertas Apple",
      subtitulo: "Más beneficios!",
      icono: "",
      slug: "ofertas-apple",
      prioridad: 30,
    },
    {
      nombre: "Outlet",
      subtitulo: "Ahorra en",
      icono: null,
      slug: "outlet-promo",
      prioridad: 40,
    },
    {
      nombre: "Hasta 24 cuotas",
      subtitulo: "Nuevo!",
      icono: null,
      slug: "hasta-24-cuotas",
      prioridad: 50,
    },
    {
      nombre: "Hasta 18 cuotas",
      subtitulo: "Nuevo!",
      icono: null,
      slug: "hasta-18-cuotas",
      prioridad: 60,
    },
    {
      nombre: "Hasta 12 cuotas",
      subtitulo: "Nuevo!",
      icono: null,
      slug: "hasta-12-cuotas",
      prioridad: 70,
    },
  ];
  for (const p of promocionesSeed) {
    await prisma.promocion.upsert({
      where: { slug: p.slug },
      create: {
        nombre: p.nombre,
        subtitulo: p.subtitulo,
        icono: p.icono,
        slug: p.slug,
        prioridad: p.prioridad,
        activo: true,
      },
      update: {
        nombre: p.nombre,
        subtitulo: p.subtitulo,
        icono: p.icono,
        prioridad: p.prioridad,
        activo: true,
      },
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

  // Constancias fiscales por defecto (urls a completar desde admin)
  const constanciasSeed = [
    { titulo: "Legajo Impositivo 2026", categoria: "impositiva", orden: 1 },
    { titulo: "Banco Galicia", categoria: "bancaria", orden: 1 },
    { titulo: "Banco ICBC", categoria: "bancaria", orden: 2 },
  ];
  for (const c of constanciasSeed) {
    const exists = await prisma.constancia_fiscal.findFirst({
      where: { titulo: c.titulo, categoria: c.categoria },
    });
    if (!exists) {
      await prisma.constancia_fiscal.create({
        data: { ...c, activo: true },
      });
    }
  }

  // Parámetros de configuración
  await prisma.parametro.upsert({
    where: { nombre: "smartpost_precio_envio" },
    create: {
      nombre: "smartpost_precio_envio",
      tipo: "number",
      valor: "4380.44",
      grupo_parametros: "envios",
    },
    update: { grupo_parametros: "envios" },
  });
  await prisma.parametro.upsert({
    where: { nombre: "valor_para_envio_gratis" },
    create: {
      nombre: "valor_para_envio_gratis",
      tipo: "number",
      valor: "200000",
      grupo_parametros: "envios",
    },
    update: { grupo_parametros: "envios" },
  });

  const fastrackZonas: Record<number, string> = {
    2: "13779.77",
    3: "18516.84",
    4: "21407.82",
    5: "22057.67",
    6: "24267.15",
    7: "26755.14",
  };
  for (const [zona, valor] of Object.entries(fastrackZonas)) {
    const nombre = `fastrack_precio_zona_${zona}`;
    await prisma.parametro.upsert({
      where: { nombre },
      create: { nombre, tipo: "number", valor, grupo_parametros: "envios" },
      update: { valor, grupo_parametros: "envios" },
    });
  }

  const { seedOdooParametros } = await import("../src/lib/odoo-config");
  await seedOdooParametros();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
