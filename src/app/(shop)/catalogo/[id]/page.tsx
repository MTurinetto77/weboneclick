import { notFound, redirect } from "next/navigation";
import { getProductById } from "@/lib/products";

type Params = Promise<{ id: string }>;

/** Compatibilidad con URLs viejas /catalogo/:id → /producto/:slug */
export default async function CatalogoIdRedirect({ params }: { params: Params }) {
  const { id } = await params;
  const product = await getProductById(Number(id));
  if (!product) notFound();
  redirect(`/producto/${product.slug}`);
}
