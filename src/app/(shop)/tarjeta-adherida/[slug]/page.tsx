import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ slug: string }>;

export default async function TarjetaPage({ params }: { params: Params }) {
  const { slug } = await params;
  const tarjeta = await prisma.tarjeta_adherida.findUnique({
    where: { slug },
    include: { beneficios: { include: { beneficio: true } } },
  });
  if (!tarjeta) notFound();

  return (
    <div className="container oc-static-page">
      <nav className="oc-breadcrumb">
        <Link href="/">Inicio</Link>
        <span>/</span>
        <Link href="/ocbeneficios">Beneficios</Link>
        <span>/</span>
        <span>{tarjeta.nombre}</span>
      </nav>
      <h1>{tarjeta.nombre}</h1>
      {tarjeta.banco && <p className="muted">{tarjeta.banco}</p>}
      <h3>Beneficios disponibles</h3>
      <ul>
        {tarjeta.beneficios.map((b) => (
          <li key={b.id_beneficio}>
            <Link href={`/beneficio/${b.beneficio.slug}`}>{b.beneficio.nombre}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
