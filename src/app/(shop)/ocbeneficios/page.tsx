import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function OcBeneficiosPage() {
  const beneficios = await prisma.beneficio.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
    include: { tarjetas: { include: { tarjeta: true } } },
  });

  return (
    <div className="container">
      <div className="oc-page-header">
        <h1>Promociones bancarias</h1>
        <p className="oc-section-lead">Beneficios y cuotas sin interés con tarjetas adheridas.</p>
      </div>
      <div className="oc-benefit-grid" style={{ paddingBottom: "2.5rem" }}>
        {beneficios.map((b) => (
          <article key={b.id_beneficio} className="oc-promo-card">
            <h3>
              <Link href={`/beneficio/${b.slug}`}>{b.nombre}</Link>
            </h3>
            {b.cuotas != null && <p className="oc-cuotas">Hasta {b.cuotas} cuotas</p>}
            {b.descripcion && <p>{b.descripcion}</p>}
            <div className="oc-tabs">
              {b.tarjetas.map((t) => (
                <Link key={t.id_tarjeta} href={`/tarjeta-adherida/${t.tarjeta.slug}`}>
                  {t.tarjeta.nombre}
                </Link>
              ))}
            </div>
          </article>
        ))}
        {!beneficios.length && <p className="muted">Próximamente publicaremos los beneficios.</p>}
      </div>
    </div>
  );
}
