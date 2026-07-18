import { notFound } from "next/navigation";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { prisma } from "@/lib/prisma";
import { pickCurrentPrice } from "@/lib/products";

type Params = Promise<{ slug: string }>;

export default async function GrupoPage({ params }: { params: Params }) {
  const { slug } = await params;
  const grupo = await prisma.grupo_producto.findUnique({
    where: { slug },
    include: {
      items: {
        orderBy: { orden: "asc" },
        include: {
          producto: {
            include: {
              precios: true,
              archivos: { include: { archivo: true }, take: 1 },
              stocks: true,
            },
          },
        },
      },
    },
  });
  if (!grupo) notFound();

  const items = grupo.items
    .filter((i) => i.producto.activo)
    .map((i) => ({
      id_producto: i.producto.id_producto,
      titulo: i.producto.titulo,
      slug: i.producto.slug,
      descripcion: i.producto.descripcion,
      precio: pickCurrentPrice(i.producto.precios),
      imagen: i.producto.archivos[0]?.archivo.link ?? null,
      stockTotal: i.producto.stocks.reduce((a, s) => a + Number(s.cantidad), 0),
      cuotas_max: i.producto.cuotas_max,
    }));

  return (
    <div className="container">
      <div className="oc-page-header">
        <nav className="oc-breadcrumb">
          <Link href="/">Inicio</Link>
          <span>/</span>
          <span>{grupo.nombre}</span>
        </nav>
        <h1>{grupo.nombre}</h1>
        {grupo.descripcion && <p className="oc-section-lead">{grupo.descripcion}</p>}
      </div>
      <div className="oc-product-grid" style={{ paddingBottom: "2.5rem" }}>
        {items.map((p) => (
          <ProductCard key={p.id_producto} product={p} />
        ))}
      </div>
    </div>
  );
}
