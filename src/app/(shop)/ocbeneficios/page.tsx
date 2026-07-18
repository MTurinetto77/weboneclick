import Link from "next/link";
import {
  PROMOCIONES_BANCARIAS,
  PROMO_CARD_LOGOS,
} from "@/lib/promos-bancarias";

export const metadata = { title: "Promociones bancarias" };

export default function OcBeneficiosPage() {
  return (
    <div className="container oc-inst-page">
      <header className="oc-page-header" style={{ textAlign: "center" }}>
        <h1>Beneficios y Promociones Vigentes</h1>
      </header>
      <div className="oc-promo-bank-grid">
        {PROMOCIONES_BANCARIAS.map((p) => (
          <article key={p.slug} className="oc-promo-bank-card">
            <div className="oc-promo-bank-logos">
              {p.tarjetas.map((key) => {
                const l = PROMO_CARD_LOGOS[key];
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={key} src={l.src} alt={l.alt} />
                );
              })}
            </div>
            <h2>{p.titulo}</h2>
            <p className="oc-promo-bank-sub">{p.subtitulo}</p>
            <p className="oc-promo-bank-avail">
              <strong>Disponible en:</strong>
              <br />
              {p.disponibleEn}
            </p>
            <Link href={`/beneficio/${p.slug}`} className="oc-promo-bank-detail">
              Detalle
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
