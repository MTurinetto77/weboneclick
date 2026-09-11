import type { CSSProperties } from "react";
import type { banner as Banner } from "@prisma/client";
import { bannerImageUrl } from "@/lib/banners";

export type BannerRow = Pick<
  Banner,
  "id_banner" | "titulo" | "imagen_desktop" | "imagen_mobile" | "html" | "clase_css" | "orden" | "link"
>;

const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

/**
 * Cierra los tags que el HTML de un banner haya dejado abiertos.
 *
 * El HTML se carga desde el admin, así que puede venir desbalanceado. Cuando eso
 * pasa, el parser del browser mete dentro del banner todo el markup que lo sigue
 * (por ejemplo el slide siguiente del carrusel), el DOM deja de coincidir con lo
 * que renderizó React y se cae la hidratación de la página entera.
 *
 * Solo agrega cierres al final: nunca reordena ni descarta nada, y es puro, así
 * que servidor y cliente producen exactamente la misma salida.
 */
export function balanceHtml(html: string): string {
  // El contenido de <script>/<style> no es markup: lo vaciamos para escanear.
  const scan = html.replace(
    /<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
    (m) => m.replace(/[^<>]/g, " ")
  );

  const stack: string[] = [];
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/g;
  let m: RegExpExecArray | null;

  while ((m = tagRe.exec(scan)) !== null) {
    const [, closing, rawTag, selfClosing] = m;
    const tag = rawTag.toLowerCase();
    if (VOID_TAGS.has(tag) || selfClosing === "/") continue;

    if (!closing) {
      stack.push(tag);
      continue;
    }
    const i = stack.lastIndexOf(tag);
    // Un cierre huérfano se ignora; el browser hace lo mismo.
    if (i !== -1) stack.length = i;
  }

  if (stack.length === 0) return html;
  return html + stack.reverse().map((tag) => `</${tag}>`).join("");
}

export function HtmlSlot({ html }: { html: string | null }) {
  if (!html) return null;
  return (
    <div
      className="oc-banner-slot"
      dangerouslySetInnerHTML={{ __html: balanceHtml(html) }}
    />
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
