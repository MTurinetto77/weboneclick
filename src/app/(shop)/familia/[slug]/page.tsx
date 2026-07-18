import { notFound } from "next/navigation";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { prisma } from "@/lib/prisma";
import { getActiveProducts } from "@/lib/products";

type Params = Promise<{ slug: string }>;

export default async function FamiliaPage({ params }: { params: Params }) {
  const { slug } = await params;
  const familia = await prisma.familia.findUnique({ where: { slug } });
  if (!familia) notFound();

  const { items } = familia.id_categoria
    ? await getActiveProducts({ categoriaId: familia.id_categoria, take: 48 })
    : await getActiveProducts({ take: 48 });

  return (
    <div className="container">
      <div className="oc-page-header">
        <nav className="oc-breadcrumb">
          <Link href="/">Inicio</Link>
          <span>/</span>
          <span>{familia.nombre}</span>
        </nav>
        <h1>{familia.titulo || familia.nombre}</h1>
        {familia.descripcion && <p className="oc-section-lead">{familia.descripcion}</p>}
      </div>
      <div className="oc-product-grid" style={{ paddingBottom: "2.5rem" }}>
        {items.map((p) => (
          <ProductCard key={p.id_producto} product={p} />
        ))}
      </div>
    </div>
  );
}
