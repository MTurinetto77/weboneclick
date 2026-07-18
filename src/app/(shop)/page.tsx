import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { getActiveProducts } from "@/lib/products";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const [jbl, fundasCat] = await Promise.all([
    prisma.marca.findFirst({
      where: { slug: "jbl" },
      select: { id_marca: true },
    }),
    prisma.categoria.findFirst({
      where: { slug: "accesorios-fundas-y-cobertores" },
      select: { id_categoria: true },
    }),
  ]);

  const [destacados, jblProducts, potenciaProducts] = await Promise.all([
    getActiveProducts({ take: 8 }),
    jbl
      ? getActiveProducts({ marcaId: jbl.id_marca, take: 5 })
      : Promise.resolve({
          items: [] as Awaited<ReturnType<typeof getActiveProducts>>["items"],
          total: 0,
        }),
    fundasCat
      ? getActiveProducts({
          categoriaId: fundasCat.id_categoria,
          q: "iPhone 17",
          take: 6,
        })
      : getActiveProducts({ q: "Funda", take: 6 }),
  ]);

  const categoryBanners = [
    {
      title: "Audio",
      href: "/audio",
      image: "/oneclick/banners/audio-full.jpg",
      text: "Tu música, tus reglas, en cualquier lugar. Con baterías de larga duración y diseños ultraligeros, nuestra colección de audio está pensada para acompañarte durante todo el día sin que te pierdas ni un solo compás.",
    },
    {
      title: "Mochilas",
      href: "/accesorios/bolsos-y-mochilas",
      image: "/oneclick/banners/mochilas-full.jpg",
      text: "Diseñadas para el ritmo de vida actual. Ofrecemos la máxima protección contra golpes y el clima, garantizando que tu mundo digital esté seguro sin importar a dónde te lleve la jornada.",
    },
    {
      title: "Fundas",
      href: "/accesorios/fundas-y-cobertores",
      image: "/oneclick/banners/fundas-full.jpg",
      text: "La fusión perfecta entre una armadura invisible y un diseño espectacular. Disfruta de una protección robusta en una funda ultradelgada y ligera que respeta y realza la forma original de tu teléfono.",
    },
  ];

  return (
    <>
      {/* Hero full-bleed estilo oneclickstore */}
      <section className="oc-hero-live">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="oc-hero-live-bg" src="/oneclick/hero-mac.jpg" alt="" />
        <div className="oc-hero-live-shade" />
        <div className="container oc-hero-live-grid">
          <div className="oc-hero-live-copy">
            <span className="oc-pill-orange">LLEGÓ TU AGUINALDO</span>
            <h1>
              Eso que venías mirando,
              <br />
              ahora sí.
            </h1>
            <p className="oc-hero-sub">MacBook Neo al mejor precio del mercado</p>
            <div className="oc-price-box">
              <span className="oc-price-box-label">Desde</span>
              <strong>$ 1.739.999</strong>
              <span className="oc-price-box-cuotas">Hasta 12 cuotas sin interés</span>
            </div>
            <Link href="/mac/macbook-neo" className="oc-hero-cta-link">
              Conocé los productos →
            </Link>
            <p className="oc-hero-foot">Hasta 18 cuotas sin interés · Hasta 50% de descuento</p>
          </div>
        </div>
      </section>

      {/* Barra utilitaria oscura debajo del hero */}
      <section className="oc-utility-bar">
        <div className="container oc-utility-bar-inner">
          <p className="oc-utility-brand">
            <span className="oc-utility-ico" aria-hidden>
              <UtilityAppleIcon />
            </span>
            OneClick - Apple Premium Reseller
          </p>
          <div className="oc-utility-links">
            <Link href="/seguimiento-de-envios">
              <span className="oc-utility-ico" aria-hidden>
                <UtilityPackageIcon />
              </span>
              Seguí tu compra
            </Link>
            <Link href="/tiendas">
              <span className="oc-utility-ico" aria-hidden>
                <UtilityStoreIcon />
              </span>
              Tiendas
            </Link>
            <Link href="/empresas">
              <span className="oc-utility-ico" aria-hidden>
                <UtilityBuildingIcon />
              </span>
              Corporativos
            </Link>
            <Link href="/faqs">
              <span className="oc-utility-ico" aria-hidden>
                <UtilityChatIcon />
              </span>
              Preguntas frecuentes
            </Link>
          </div>
          <Link href="/servicio-tecnico" className="oc-utility-service">
            <span className="oc-utility-ico" aria-hidden>
              <UtilityToolsIcon />
            </span>
            Servicio técnico personalizado
          </Link>
        </div>
      </section>

      {/* Franja mundial — un poco más ancha y baja */}
      <section className="oc-mundial-wrap">
        <div className="oc-mundial">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="oc-mundial-bg"
            src="/oneclick/scraped/home-08.webp"
            alt=""
          />
          <div className="oc-mundial-shade" aria-hidden />
          <div className="oc-mundial-inner">
            <div className="oc-mundial-copy">
              <div className="oc-mundial-stars" aria-hidden>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/oneclick/mundial-stars.png" alt="" />
              </div>
              <h2>¡El mundial ya está acá!</h2>
            </div>
            <div className="oc-mundial-aside">
              <p>Disfrutalo con precios especiales</p>
              <Link href="/promo/mundial" className="oc-btn oc-btn-red oc-mundial-cta">
                Ver productos
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="oc-section oc-destacados">
        <div className="container">
          <div className="oc-destacados-head">
            <h2>Destacados</h2>
            <div className="oc-seg" role="tablist" aria-label="Categorías destacadas">
              <span className="oc-seg-item is-active" role="tab" aria-selected="true">
                Apple
              </span>
              <Link href="/marca/jbl" className="oc-seg-item" role="tab" aria-selected="false">
                JBL
              </Link>
              <Link href="/accesorios" className="oc-seg-item" role="tab" aria-selected="false">
                Accesorios
              </Link>
            </div>
          </div>
          <div className="oc-product-grid oc-product-scroll">
            {destacados.items.map((p) => (
              <ProductCard key={p.id_producto} product={p} />
            ))}
          </div>
          {!destacados.items.length && (
            <p className="muted">Todavía no hay productos sincronizados.</p>
          )}
        </div>
      </section>

      <section className="oc-section oc-promo-rows">
        <div className="container">
          <div className="oc-promo-grid">
            <article className="oc-promo-card oc-promo-dark">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="oc-promo-brand"
                src="/oneclick/promos/mophie-logo.png"
                alt="mophie"
              />
              <div className="oc-promo-copy">
                <h3>Tu nuevo iPhone viene con regalo.</h3>
                <p>
                  Con la compra de cualquier iPhone, llevate de regalo un
                  cargador Mophie de 30W.
                </p>
                <Link href="/iphone" className="oc-btn oc-btn-red">
                  ¡Comprar ahora!
                </Link>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="oc-promo-media"
                src="/oneclick/promos/media-iphone-mophie.webp"
                alt="iPhone naranja con cargador Mophie 30W"
              />
            </article>
            <article className="oc-promo-card oc-promo-light">
              <div className="oc-promo-copy">
                <h3>¿Buscás experiencia personalizada?</h3>
                <p>
                  Hablá con nuestros asesores y encontrá la compra perfecta
                  para vos.
                </p>
                <a
                  href="https://wa.me/5491100000000"
                  className="oc-btn oc-btn-red oc-btn-wa"
                  target="_blank"
                  rel="noreferrer"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16">
                    <path
                      fill="currentColor"
                      d="M12.04 2C6.58 2 2.15 6.4 2.15 11.84c0 1.96.52 3.88 1.5 5.57L2 22l4.75-1.55a9.9 9.9 0 0 0 5.29 1.51h.01c5.46 0 9.89-4.4 9.89-9.84C21.94 6.4 17.5 2 12.04 2zm5.76 14.15c-.24.68-1.4 1.25-1.93 1.33-.5.08-1.12.11-1.81-.11-.42-.14-.95-.31-1.64-.6-2.89-1.25-4.77-4.16-4.92-4.35-.14-.19-1.2-1.6-1.2-3.05 0-1.45.76-2.16 1.03-2.45.27-.29.59-.36.79-.36h.57c.18 0 .42-.07.66.5.24.58.82 2 .89 2.15.07.15.12.32.02.52-.1.19-.15.32-.3.49-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.29.76 1.25 1.63 2.03 1.12 1 2.07 1.31 2.36 1.46.29.15.46.12.63-.07.17-.19.73-.85.93-1.14.2-.29.39-.24.66-.14.27.1 1.71.8 2 .95.29.15.49.22.56.34.07.12.07.7-.17 1.38z"
                    />
                  </svg>
                  Contactate
                </a>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="oc-promo-media oc-promo-media-cover"
                src="/oneclick/promos/media-experiencia.webp"
                alt="Asesoramiento personalizado en tienda"
              />
            </article>
            <article className="oc-promo-card oc-promo-light">
              <div className="oc-promo-copy">
                <h3>¿Tenés un problema con tu iPhone 17?</h3>
                <p>Servicio Técnico Autorizado</p>
                <Link href="/servicio-tecnico" className="oc-btn oc-btn-red">
                  Contactate
                </Link>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="oc-promo-media oc-promo-media-phones"
                src="/oneclick/promos/media-servicio.webp"
                alt="iPhone 17 cámara"
              />
            </article>
          </div>
        </div>
      </section>

      {jblProducts.items.length > 0 && (
        <section className="oc-section">
          <div className="container">
            <div className="oc-section-head">
              <h2>¡Llevá la fiesta a donde quieras!</h2>
              <Link
                href="/marca/jbl"
                className="oc-section-more"
                aria-label="Ver más productos JBL"
              >
                +
              </Link>
            </div>
            <div className="oc-product-grid oc-product-grid-5">
              {jblProducts.items.map((p) => (
                <ProductCard key={p.id_producto} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="oc-section oc-category-banners">
        <div className="container">
          <div className="oc-category-banner-grid">
            {categoryBanners.map((b) => (
              <Link key={b.title} href={b.href} className="oc-category-banner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.image} alt={b.title} />
                <div className="oc-category-banner-shade" />
                <div className="oc-category-banner-copy">
                  <h3>{b.title}</h3>
                  <p>{b.text}</p>
                  <span className="oc-category-banner-cta">Ver Productos</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {potenciaProducts.items.length > 0 && (
        <section className="oc-section">
          <div className="container">
            <div className="oc-section-head">
              <h2>Potenciá tu iPhone</h2>
              <Link
                href="/accesorios/fundas-y-cobertores"
                className="oc-section-more"
                aria-label="Ver más fundas"
              >
                +
              </Link>
            </div>
            <div className="oc-product-grid oc-product-scroll">
              {potenciaProducts.items.map((p) => (
                <ProductCard key={p.id_producto} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function UtilityAppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.7 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9-.7 0-1.9-.8-3.1-.8-1.6 0-3.1 1-3.9 2.5-1.7 2.9-.4 7.2 1.2 9.6.8 1.1 1.7 2.4 3 2.4 1.2 0 1.6-.8 3.1-.8s1.8.8 3.1.8c1.3 0 2.1-1.1 2.9-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.5-1-2.7-3.9zM14.4 5.8c.7-.8 1.1-1.9 1-3-.9.1-2.1.6-2.8 1.5-.6.7-1.2 1.9-1 3 1 .1 2.1-.5 2.8-1.5z" />
    </svg>
  );
}

function UtilityPackageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2.5 3.5 7v10L12 21.5 20.5 17V7L12 2.5z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M12 12 3.5 7M12 12v9.5M12 12l8.5-5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function UtilityStoreIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10h16v10H4V10zM3 6.5 4.5 3h15L21 6.5c0 1.4-1.1 2.5-2.5 2.5S16 7.9 16 6.5C16 7.9 14.9 9 13.5 9S11 7.9 11 6.5C11 7.9 9.9 9 8.5 9S6 7.9 6 6.5C6 7.9 4.9 9 3.5 9 3.2 9 3 8.8 3 8.5V6.5z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UtilityBuildingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 21V5.5A1.5 1.5 0 0 1 5.5 4h8A1.5 1.5 0 0 1 15 5.5V21M15 10h3.5A1.5 1.5 0 0 1 20 11.5V21M4 21h16"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path d="M8 8h2M8 12h2M8 16h2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function UtilityChatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H10l-4.5 3.2c-.7.5-1.5 0-1.5-.8V6a2 2 0 0 1 2-2z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UtilityToolsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-2.5 2.5-2.5z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
