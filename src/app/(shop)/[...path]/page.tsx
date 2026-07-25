import { notFound } from "next/navigation";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { PromoShopListing } from "@/components/promo-shop-listing";
import { getActiveProducts, getCategoryBySlugPath } from "@/lib/products";
import { getPromoBySlug } from "@/lib/promos";

type Params = Promise<{ path: string[] }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const RESERVED = new Set([
  "shop",
  "producto",
  "marca",
  "etiqueta",
  "familia",
  "group",
  "beneficio",
  "tarjeta-adherida",
  "carrito",
  "checkout",
  "catalogo",
  "contacto",
  "cuenta",
  "admin",
  "api",
  "mi-cuenta",
  "lista-deseos",
  "finalizar-compra",
  "ocbeneficios",
  "tiendas",
  "nosotros",
  "faqs",
  "empresas",
  "servicio-tecnico",
]);

export default async function CategoryCatchAllPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { path } = await params;
  const sp = await searchParams;

  if (!path?.length || RESERVED.has(path[0])) notFound();

  // Promociones: un solo segmento → /vacaciones-de-invierno
  if (path.length === 1) {
    const promo = await getPromoBySlug(path[0]);
    if (promo) {
      return <PromoShopListing promo={promo} searchParams={sp} />;
    }
  }

  const category = await getCategoryBySlugPath(path);
  if (!category) notFound();

  const page = Math.max(1, Number(sp.page || 1) || 1);
  const take = 24;
  const { items, total } = await getActiveProducts({
    categoriaId: category.id_categoria,
    take,
    skip: (page - 1) * take,
  });

  return (
    <div className="container">
      <div className="oc-page-header">
        <nav className="oc-breadcrumb">
          <Link href="/">Inicio</Link>
          <span>/</span>
          <span>{category.nombre}</span>
        </nav>
        <h1>{category.nombre}</h1>
        <p className="muted">{total} productos</p>
      </div>

      {category.subcategorias?.length > 0 && (
        <div className="oc-tabs" style={{ marginBottom: "1.25rem" }}>
          {category.subcategorias.map((sub) => (
            <Link key={sub.id_categoria} href={`/${[...path, sub.slug].join("/")}`}>
              {sub.nombre}
            </Link>
          ))}
        </div>
      )}

      <div className="oc-product-grid" style={{ paddingBottom: "2.5rem" }}>
        {items.map((p) => (
          <ProductCard key={p.id_producto} product={p} />
        ))}
      </div>
      {!items.length && <p className="muted">No hay productos en esta categoría.</p>}
    </div>
  );
}
