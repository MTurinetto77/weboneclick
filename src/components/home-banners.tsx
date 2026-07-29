import type { CSSProperties } from "react";
import type { banner as Banner } from "@prisma/client";
import { bannerImageUrl } from "@/lib/banners";

type BannerRow = Pick<
  Banner,
  "id_banner" | "titulo" | "imagen_desktop" | "imagen_mobile" | "html" | "clase_css" | "orden" | "link"
>;

function HtmlSlot({ html }: { html: string | null }) {
  if (!html) return null;
  return <div className="oc-banner-slot" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function HomeHeroBanner({ banner }: { banner: BannerRow | null | undefined }) {
  if (!banner) return null;
  const desktop = bannerImageUrl(banner.imagen_desktop);
  const mobile = banner.imagen_mobile ? bannerImageUrl(banner.imagen_mobile) : null;

  return (
    <section className="oc-hero-live">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="oc-hero-live-bg"
        src={desktop}
        alt=""
        {...(mobile
          ? {
              srcSet: `${mobile} 768w, ${desktop} 1200w`,
              sizes: "100vw",
            }
          : {})}
      />
      <div className="oc-hero-live-shade" />
      <div className="container oc-hero-live-grid">
        <HtmlSlot html={banner.html} />
      </div>
    </section>
  );
}

export function HomeSecundarioBanner({ banner }: { banner: BannerRow | null | undefined }) {
  if (!banner) return null;
  const bg = bannerImageUrl(banner.imagen_desktop);

  return (
    <section className="oc-mundial-wrap">
      <div className="oc-mundial">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="oc-mundial-bg" src={bg} alt="" />
        <div className="oc-mundial-shade" aria-hidden />
        <div className="oc-mundial-inner">
          <HtmlSlot html={banner.html} />
        </div>
      </div>
    </section>
  );
}

export function HomeTripleBanners({ banners }: { banners: BannerRow[] }) {
  if (!banners.length) return null;

  return (
    <section className="oc-section oc-promo-rows">
      <div className="container">
        <div className="oc-promo-grid">
          {banners.map((b) => {
            const extra = (b.clase_css || "").trim();
            const className = ["oc-promo-card", extra].filter(Boolean).join(" ");
            // Fondo opcional: solo si hay imagen y no es ya el diseño basado en HTML+color sólido
            const bg = b.imagen_desktop ? bannerImageUrl(b.imagen_desktop) : "";
            const style =
              bg && !extra.includes("oc-promo-dark") && !extra.includes("oc-promo-light")
                ? { backgroundImage: `url(${bg})`, backgroundSize: "cover", backgroundPosition: "center" }
                : undefined;

            return (
              <article key={b.id_banner} className={className} style={style}>
                <HtmlSlot html={b.html} />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function HomePieBanner({ banner }: { banner: BannerRow | null | undefined }) {
  if (!banner) return null;
  const bg = bannerImageUrl(banner.imagen_desktop);
  const style = bg
    ? ({ ["--oc-banner-bg"]: `url(${bg})` } as CSSProperties)
    : undefined;

  return (
    <section className="oc-section oc-zagg-wrap">
      <div className="container">
        <div className="oc-zagg-banner" style={style}>
          <HtmlSlot html={banner.html} />
        </div>
      </div>
    </section>
  );
}
