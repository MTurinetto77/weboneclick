import { notFound } from "next/navigation";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { prisma } from "@/lib/prisma";
import { pickCurrentPrice } from "@/lib/products";

type Params = Promise<{ slug: string }>;

export default async function EtiquetaPage({ params }: { params: Params }) {
  const { slug } = await params;
  const etiqueta = await prisma.etiqueta.findUnique({ where: { slug } });
  if (!etiqueta) notFound();

  const rows = await prisma.producto.findMany({
    where: {
      activo: true,
      etiquetas: { some: { id_etiqueta: etiqueta.id_etiqueta } },
    },
    include: { precios: true, archivos: { include: { archivo: true }, take: 1 }, stocks: true },
    orderBy: { id_producto: "desc" },
    take: 48,
  });

  const items = rows.map((p) => ({
    id_producto: p.id_producto,
    titulo: p.titulo,
    slug: p.slug,
    descripcion: p.descripcion,
    precio: pickCurrentPrice(p.precios),
    imagen: p.archivos[0]?.archivo.link ?? null,
    stockTotal: p.stocks.reduce((a, s) => a + Number(s.cantidad), 0),
    stockTracked: p.stocks.length > 0,
    cuotas_max: p.cuotas_max,
  }));

  return (
    <div className="container">
      <div className="oc-page-header">
        <nav className="oc-breadcrumb">
          <Link href="/">Inicio</Link>
          <span>/</span>
          <span>{etiqueta.nombre}</span>
        </nav>
        <h1>{etiqueta.nombre}</h1>
      </div>
      <div className="oc-product-grid" style={{ paddingBottom: "2.5rem" }}>
        {items.map((p) => (
          <ProductCard key={p.id_producto} product={p} />
        ))}
      </div>
    </div>
  );
}
