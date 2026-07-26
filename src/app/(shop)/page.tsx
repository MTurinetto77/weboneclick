import Link from "next/link";
import {
  HomeHeroBanner,
  HomePieBanner,
  HomeSecundarioBanner,
  HomeTripleBanners,
} from "@/components/home-banners";
import { HomeDestacados } from "@/components/home-destacados";
import { ProductCard } from "@/components/product-card";
import { getActiveBanners, getActiveProducts } from "@/lib/products";
import { prisma } from "@/lib/prisma";

type ProductPage = Awaited<ReturnType<typeof getActiveProducts>>;
const emptyProducts: ProductPage = { items: [], total: 0 };

export default async function HomePage() {
  const [apple, jbl, accesoriosCat, fundasCat, heroBanners, secundarioBanners, tripleBanners, pieBanners] =
    await Promise.all([
      prisma.marca.findFirst({
        where: { slug: "apple" },
        select: { id_marca: true },
      }),
      prisma.marca.findFirst({
        where: { slug: "jbl" },
        select: { id_marca: true },
      }),
      prisma.categoria.findFirst({
        where: { slug: "accesorios" },
        select: { id_categoria: true },
      }),
      prisma.categoria.findFirst({
        where: { slug: "accesorios-fundas-y-cobertores" },
        select: { id_categoria: true },
      }),
      getActiveBanners("hero"),
      getActiveBanners("secundario"),
      getActiveBanners("triple"),
      getActiveBanners("pie"),
    ]);

  const [destacadosApple, destacadosJbl, destacadosAccesorios, potenciaProducts] =
    await Promise.all([
      apple
        ? getActiveProducts({ marcaId: apple.id_marca, take: 8 })
        : Promise.resolve(emptyProducts),
      jbl
        ? getActiveProducts({ marcaId: jbl.id_marca, take: 8 })
        : Promise.resolve(emptyProducts),
      accesoriosCat
        ? getActiveProducts({ categoriaId: accesoriosCat.id_categoria, take: 8 })
        : Promise.resolve(emptyProducts),
      fundasCat
        ? getActiveProducts({
            categoriaId: fundasCat.id_categoria,
            q: "iPhone 17",
            take: 6,
          })
        : getActiveProducts({ q: "Funda", take: 6 }),
    ]);

  const jblProducts = destacadosJbl.items.slice(0, 5);

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
      <HomeHeroBanner banner={heroBanners[0]} />

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

      <HomeSecundarioBanner banner={secundarioBanners[0]} />

      <HomeDestacados
        products={{
          apple: destacadosApple.items,
          jbl: destacadosJbl.items,
          accesorios: destacadosAccesorios.items,
        }}
      />

      <HomeTripleBanners banners={tripleBanners} />

      {jblProducts.length > 0 && (
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
              {jblProducts.map((p) => (
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
        <section className="oc-section oc-potencia">
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

      <HomePieBanner banner={pieBanners[0]} />
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
    <svg width="16" height="16" viewBox="0 0 134.23 98.17" fill="currentColor" aria-hidden>
      <path d="M0,72.35V13.2C0,4.61,4.61,0,13.2,0h66.44c8.59,0,13.2,4.65,13.2,13.2v11.5h11.99c4.65,0,7.78,1.16,10.6,4.3l15.44,17.45c2.64,2.95,3.36,5.14,3.36,9.8v16.11c0,8.59-4.61,13.2-13.2,13.2h-5.15c-1.61,7.21-8.05,12.62-15.75,12.62s-14.14-5.41-15.75-12.62h-34.32c-1.61,7.21-8.01,12.62-15.7,12.62s-14.14-5.41-15.79-12.62h-5.37c-8.59,0-13.2-4.61-13.2-13.2ZM49.62,76.82h34.5V13.65c0-3.31-1.7-4.92-4.88-4.92H13.65c-3.27,0-4.88,1.61-4.88,4.92v58.3c0,3.27,1.61,4.88,4.88,4.88h5.37c2.19-6.4,8.23-10.96,15.35-10.96s13.11,4.57,15.26,10.96ZM43.18,82.01c0-4.92-3.94-8.9-8.81-8.9s-8.9,3.98-8.9,8.9,4.03,8.86,8.9,8.86,8.81-3.98,8.81-8.86ZM108.95,82.01c0-4.92-3.98-8.9-8.81-8.9s-8.86,3.98-8.86,8.9,3.98,8.86,8.86,8.86,8.81-3.98,8.81-8.86ZM115.44,76.82h5.19c3.22,0,4.88-1.61,4.88-4.88v-15.44c0-1.83-.63-3.62-1.88-5.05l-13.87-15.57c-1.74-1.97-3.4-2.42-5.68-2.42h-11.23v34.14c2.19-1.12,4.7-1.75,7.29-1.75,7.11,0,13.11,4.57,15.3,10.96ZM97.32,52.66v-14.63h5.41c1.39,0,2.55.63,3.58,1.79l12.89,14.5c.67.71,1.07,1.3,1.07,2.37h-18.93c-2.46,0-4.03-1.56-4.03-4.02Z" />
    </svg>
  );
}

function UtilityStoreIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 161.15 154.52" fill="currentColor" aria-hidden>
      <path d="M11.95,138.35v-56.08c-7.18-4.14-11.95-11.95-11.95-20.86v-1.38c0-2.97.76-5.59,2.28-8.08l18.17-30.81v-5.94c0-9.39,5.94-15.2,15.47-15.2h89.38c9.53,0,15.47,5.81,15.47,15.2v5.94l18.17,30.81c1.45,2.49,2.21,5.11,2.21,8.08v1.38c0,8.91-4.7,16.72-11.88,20.86v56.08c0,10.16-6.15,16.17-16.65,16.17H28.53c-10.5,0-16.58-6.01-16.58-16.17ZM24.18,74.87c6.7,0,11.19-3.38,12.78-8.49H11.47c1.59,5.11,6.01,8.49,12.71,8.49ZM146.57,55.6l-14.37-24.66H28.53l-14.02,24.66h132.07ZM75.5,140.98h53.6c4.28,0,6.63-2.35,6.63-6.77v-48.7c-7.18-.34-13.47-3.8-17.54-9.05-4.28,5.6-11.05,9.05-18.79,9.05s-14.51-3.52-18.79-9.12c-4.28,5.6-11.05,9.12-18.79,9.12s-14.51-3.45-18.79-9.05c-4.08,5.25-10.36,8.71-17.54,9.05v48.7c0,4.42,2.35,6.77,6.63,6.77h3.66v-37.37c0-3.25,2.14-5.31,5.39-5.31h29.01c3.25,0,5.32,2.07,5.32,5.31v37.37ZM128.2,18.72v-1.66c0-3.18-1.86-5.11-4.97-5.11H37.92c-3.11,0-4.97,1.93-4.97,5.11v1.66h95.25ZM61.82,74.87c6.7,0,11.12-3.38,12.71-8.49h-25.49c1.59,5.11,6.08,8.49,12.78,8.49ZM99.4,74.87c6.7,0,11.19-3.38,12.78-8.49h-25.49c1.52,5.11,6.01,8.49,12.71,8.49ZM92.97,94.63h27.91c3.25,0,5.32,2.07,5.32,5.32v19.62c0,3.18-2.07,5.32-5.32,5.32h-27.91c-3.25,0-5.39-2.14-5.39-5.32v-19.62c0-3.25,2.14-5.32,5.39-5.32ZM136.97,74.87c6.7,0,11.19-3.38,12.78-8.49h-25.49c1.52,5.11,6.01,8.49,12.71,8.49Z" />
    </svg>
  );
}

function UtilityBuildingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 178.11 178.11" fill="currentColor" aria-hidden>
      <path d="M0,89.05C0,40.34,40.26,0,88.97,0s89.14,40.34,89.14,89.05-40.35,89.05-89.05,89.05S0,137.85,0,89.05ZM110.95,157.25c2.24-.78,4.48-1.64,6.72-2.58v-82.85h22.76c5.95,0,9.48,3.88,9.48,10.09v44.92c6.72-10.95,10.69-23.88,10.69-37.76,0-39.66-31.98-71.47-71.64-71.47S17.59,49.4,17.59,89.05c0,18.53,6.98,35.35,18.45,48.02V60.35c0-6.21,3.53-10.17,9.48-10.17h55.95c5.95,0,9.48,3.97,9.48,10.17v96.9ZM65.35,78.54c1.21,0,2.07-.86,2.07-1.98v-9.14c0-1.21-.86-2.07-2.07-2.07h-9.31c-1.21,0-1.98.86-1.98,2.07v9.14c0,1.12.78,1.98,1.98,1.98h9.31ZM65.35,100.78c1.21,0,2.07-.86,2.07-2.07v-9.05c0-1.21-.86-2.07-2.07-2.07h-9.31c-1.21,0-1.98.87-1.98,2.07v9.05c0,1.21.78,2.07,1.98,2.07h9.31ZM65.35,123.2c1.21,0,2.07-.87,2.07-2.07v-9.05c0-1.21-.86-2.07-2.07-2.07h-9.31c-1.21,0-1.98.86-1.98,2.07v9.05c0,1.21.78,2.07,1.98,2.07h9.31ZM65.35,145.61c1.21,0,2.07-.87,2.07-2.07v-9.14c0-1.12-.86-1.98-2.07-1.98h-9.31c-1.21,0-1.98.86-1.98,1.98v9.14c0,1.21.78,2.07,1.98,2.07h9.31ZM90.78,78.54c1.12,0,1.98-.86,1.98-1.98v-9.14c0-1.21-.86-2.07-1.98-2.07h-9.4c-1.12,0-1.98.86-1.98,2.07v9.14c0,1.12.86,1.98,1.98,1.98h9.4ZM90.78,100.78c1.12,0,1.98-.86,1.98-2.07v-9.05c0-1.21-.86-2.07-1.98-2.07h-9.4c-1.12,0-1.98.87-1.98,2.07v9.05c0,1.21.86,2.07,1.98,2.07h9.4ZM90.78,123.2c1.12,0,1.98-.87,1.98-2.07v-9.05c0-1.21-.86-2.07-1.98-2.07h-9.4c-1.12,0-1.98.86-1.98,2.07v9.05c0,1.21.86,2.07,1.98,2.07h9.4ZM90.78,145.61c1.12,0,1.98-.87,1.98-2.07v-9.14c0-1.12-.86-1.98-1.98-1.98h-9.4c-1.12,0-1.98.86-1.98,1.98v9.14c0,1.21.86,2.07,1.98,2.07h9.4ZM137.59,96.73c.95,0,1.64-.69,1.64-1.64v-7.41c0-.87-.69-1.64-1.64-1.64h-7.59c-.95,0-1.72.78-1.72,1.64v7.41c0,.95.77,1.64,1.72,1.64h7.59ZM137.59,115.6c.95,0,1.64-.69,1.64-1.72v-7.24c0-.95-.69-1.64-1.64-1.64h-7.59c-.95,0-1.72.69-1.72,1.64v7.24c0,1.04.77,1.72,1.72,1.72h7.59ZM137.59,134.58c.95,0,1.64-.78,1.64-1.64v-7.41c0-.87-.69-1.64-1.64-1.64h-7.59c-.95,0-1.72.78-1.72,1.64v7.41c0,.87.77,1.64,1.72,1.64h7.59Z" />
    </svg>
  );
}

function UtilityChatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 512 512" fill="currentColor" aria-hidden>
      <path d="M448 0H64C28.7 0 0 28.7 0 64v288c0 35.3 28.7 64 64 64h96v84c0 9.8 11.2 15.5 19.1 9.7L304 416h144c35.3 0 64-28.7 64-64V64c0-35.3-28.7-64-64-64z" />
    </svg>
  );
}

function UtilityToolsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 133.51 131.49" fill="currentColor" aria-hidden>
      <path d="M62.63,123.25l-3.26,6.11c-.77,1.54-2.37,2.37-4.21,2.07-1.84-.35-3.03-1.66-3.32-3.5l-1.01-6.76c-2.61-.71-5.16-1.66-7.71-2.73l-4.98,4.45c-1.31,1.18-3.14,1.54-4.86.59-1.54-.89-2.19-2.67-1.84-4.45l1.36-6.64c-2.14-1.54-4.33-3.32-6.29-5.16l-6.17,2.55c-1.78.77-3.5.3-4.8-1.19-1.13-1.36-1.25-3.2-.3-4.81l3.56-5.81c-1.48-2.19-2.73-4.57-4.03-7.06l-6.76.3c-1.78.12-3.5-.89-4.03-2.73-.59-1.66,0-3.44,1.42-4.51l5.28-4.27c-.71-2.61-1.19-5.28-1.36-8.07l-6.47-2.08c-1.84-.59-2.85-2.01-2.85-3.85s1.01-3.32,2.85-3.85l6.47-2.08c.18-2.79.71-5.4,1.36-8.07l-5.34-4.27c-1.36-1.07-1.96-2.79-1.36-4.51.59-1.78,2.25-2.79,4.03-2.67l6.76.24c1.3-2.55,2.55-4.86,4.03-7.12l-3.56-5.81c-1.01-1.48-.77-3.32.3-4.68,1.3-1.48,3.02-1.9,4.74-1.18l6.29,2.43c1.9-1.72,4.09-3.56,6.23-5.16l-1.36-6.52c-.42-1.96.3-3.62,1.84-4.45,1.72-.95,3.56-.71,4.86.59l4.98,4.39c2.55-1.07,5.1-1.96,7.71-2.73l1.01-6.7c.3-1.84,1.48-3.15,3.26-3.5,1.9-.3,3.5.53,4.27,2.01l3.26,6.11c1.36-.12,2.67-.18,4.09-.18s2.67.06,4.03.18l3.26-6.11c.77-1.48,2.37-2.31,4.21-2.01,1.84.35,3.08,1.66,3.32,3.5l1.01,6.7c2.61.77,5.16,1.66,7.65,2.73l5.04-4.45c1.3-1.24,3.14-1.48,4.86-.53,1.54.83,2.25,2.49,1.84,4.45l-1.36,6.52c2.14,1.6,4.33,3.44,6.23,5.16l6.23-2.43c1.78-.71,3.5-.3,4.8,1.18,1.07,1.36,1.25,3.2.3,4.68l-3.56,5.81c1.48,2.25,2.79,4.57,4.03,7.12l6.76-.24c1.78-.12,3.5.89,4.03,2.73.59,1.66-.06,3.38-1.42,4.45l-5.28,4.21c.65,2.73,1.13,5.34,1.42,8.13l6.35,2.08c1.84.59,3.03,2.01,3.03,3.85s-1.19,3.26-3.03,3.85l-6.35,2.08c-.3,2.79-.71,5.46-1.42,8.07l5.34,4.27c1.31,1.07,1.96,2.85,1.36,4.57-.53,1.78-2.25,2.79-4.03,2.67l-6.76-.3c-1.25,2.49-2.55,4.86-4.03,7.06l3.56,5.81c.95,1.6.83,3.44-.3,4.81-1.31,1.49-3.03,1.96-4.8,1.19l-6.23-2.55c-1.9,1.84-4.09,3.62-6.23,5.16l1.36,6.64c.47,1.78-.3,3.56-1.78,4.45-1.78.95-3.62.59-4.92-.59l-5.04-4.45c-2.49,1.06-5.04,2.01-7.65,2.73l-1.01,6.76c-.24,1.84-1.48,3.14-3.26,3.5-1.9.3-3.5-.53-4.27-2.07l-3.26-6.11c-1.36.12-2.67.18-4.03.18s-2.79-.06-4.09-.18ZM38.67,102.79l15.78-25.8c-2.73-2.97-4.33-6.88-4.33-11.15s1.6-8.24,4.33-11.21l-15.36-26.28c-11.21,8.48-18.33,22-18.33,37.43s6.94,28.53,17.91,37.01ZM112.51,70.46h-30.07c-1.96,6.88-8.3,11.8-15.84,11.8-1.31,0-2.61-.12-3.86-.41l-15.78,25.98c5.93,2.79,12.63,4.39,19.75,4.39,24.32,0,43.53-18.15,45.79-41.76ZM82.38,60.79h30.13c-2.37-23.49-21.59-41.58-45.79-41.58-6.94,0-13.46,1.48-19.28,4.15l15.36,26.33c1.19-.3,2.49-.42,3.8-.42,7.35,0,13.64,4.81,15.78,11.51ZM73.37,65.83c0-3.85-2.97-6.76-6.76-6.76s-6.7,2.9-6.7,6.76,2.91,6.64,6.7,6.64,6.76-2.85,6.76-6.64Z" />
    </svg>
  );
}
