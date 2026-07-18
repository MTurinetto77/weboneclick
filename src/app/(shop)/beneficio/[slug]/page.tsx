import { notFound } from "next/navigation";
import Link from "next/link";
import {
  formatPromoDate,
  getPromoBySlug,
  PROMO_CARD_LOGOS,
  PROMOCIONES_BANCARIAS,
} from "@/lib/promos-bancarias";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return PROMOCIONES_BANCARIAS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const promo = getPromoBySlug(slug);
  return { title: promo?.titulo ?? "Beneficio" };
}

export default async function BeneficioPage({ params }: { params: Params }) {
  const { slug } = await params;
  const promo = getPromoBySlug(slug);
  if (!promo) notFound();

  return (
    <div className="container oc-beneficio-detail">
      <h1>{promo.titulo}</h1>
      <p className="oc-beneficio-sub">{promo.subtitulo}</p>

      <div className="oc-beneficio-vigencia">
        <div>
          <span>Válido desde:</span>
          <strong>{formatPromoDate(promo.vigenciaDesde)}</strong>
        </div>
        <div>
          <span>Válido hasta:</span>
          <strong>{formatPromoDate(promo.vigenciaHasta)}</strong>
        </div>
      </div>

      <section className="oc-beneficio-block">
        <h2>Pagando con:</h2>
        <ul className="oc-beneficio-cards">
          {promo.tarjetas.map((key) => {
            const card = PROMO_CARD_LOGOS[key];
            return (
              <li key={key}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={card.src} alt={card.alt} />
                <span>{card.alt}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="oc-beneficio-block">
        <h2>Disponible en:</h2>
        <p>{promo.disponibleEn}</p>
      </section>

      {promo.detalles ? (
        <section className="oc-beneficio-block">
          <h2>Detalles de la Promoción:</h2>
          <p>{promo.detalles}</p>
        </section>
      ) : null}

      {promo.legales ? (
        <section className="oc-beneficio-block">
          <h2>Legales:</h2>
          <p>
            {promo.legales}{" "}
            <Link href="/bases-y-condiciones">Ver bases y condiciones</Link>
          </p>
        </section>
      ) : null}

      <p className="oc-beneficio-back">
        <Link href="/ocbeneficios">← Volver a Beneficios</Link>
      </p>
    </div>
  );
}
