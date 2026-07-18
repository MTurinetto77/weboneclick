import { notFound } from "next/navigation";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { prisma } from "@/lib/prisma";
import { getActiveProducts } from "@/lib/products";

type Params = Promise<{ slug: string }>;

export default async function MarcaPage({ params }: { params: Params }) {
  const { slug } = await params;
  const marca = await prisma.marca.findUnique({
    where: { slug },
    select: { id_marca: true, nombre: true, slug: true },
  });
  if (!marca) notFound();

  const { items } = await getActiveProducts({ marcaId: marca.id_marca, take: 48 });

  return (
    <div className="container">
      <div className="oc-page-header">
        <nav className="oc-breadcrumb">
          <Link href="/">Inicio</Link>
          <span>/</span>
          <Link href="/shop">Marcas</Link>
          <span>/</span>
          <span>{marca.nombre}</span>
        </nav>
        <h1>{marca.nombre}</h1>
      </div>
      <div className="oc-product-grid" style={{ paddingBottom: "2.5rem" }}>
        {items.map((p) => (
          <ProductCard key={p.id_producto} product={p} />
        ))}
      </div>
    </div>
  );
}
