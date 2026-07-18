import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ slug: string }>;

export default async function BeneficioPage({ params }: { params: Params }) {
  const { slug } = await params;
  const beneficio = await prisma.beneficio.findUnique({
    where: { slug },
    include: { tarjetas: { include: { tarjeta: true } } },
  });
  if (!beneficio) notFound();

  return (
    <div className="container oc-static-page">
      <nav className="oc-breadcrumb">
        <Link href="/">Inicio</Link>
        <span>/</span>
        <Link href="/ocbeneficios">Beneficios</Link>
        <span>/</span>
        <span>{beneficio.nombre}</span>
      </nav>
      <h1>{beneficio.nombre}</h1>
      {beneficio.cuotas != null && <p className="oc-cuotas">Hasta {beneficio.cuotas} cuotas sin interés</p>}
      {beneficio.descripcion && <p>{beneficio.descripcion}</p>}
      <h3>Tarjetas adheridas</h3>
      <ul>
        {beneficio.tarjetas.map((t) => (
          <li key={t.id_tarjeta}>
            <Link href={`/tarjeta-adherida/${t.tarjeta.slug}`}>{t.tarjeta.nombre}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
