import { notFound } from "next/navigation";
import { CategoryShopListing } from "@/components/category-shop-listing";
import { PromoShopListing } from "@/components/promo-shop-listing";
import { getCategoryBySlugPath } from "@/lib/products";
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
  "reemplazo-de-pantalla-o-bateria",
  "programas-de-calidad",
  "programa-exchange",
  "demo",
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

  return (
    <CategoryShopListing
      category={category}
      path={path}
      searchParams={sp}
    />
  );
}
