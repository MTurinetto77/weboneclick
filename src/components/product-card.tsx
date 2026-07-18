import Link from "next/link";
import { formatPriceArs, precioSinImpuestos } from "@/lib/pricing";
import { uploadPublicUrl } from "@/lib/utils";
import type { ProductListItem } from "@/lib/products";

/** Card liviana: sin server actions (evita hinchar el grafo de Turbopack/Webpack). */
export function ProductCard({ product }: { product: ProductListItem }) {
  const sinImp = precioSinImpuestos(product.precio);
  const cuotas = product.cuotas_max ?? 12;

  return (
    <article className="oc-product-card">
      <Link href={`/producto/${product.slug}`} className="oc-product-card-media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imagen ? uploadPublicUrl(product.imagen) : "/placeholder-product.svg"}
          alt={product.titulo}
        />
      </Link>
      <div className="oc-product-card-body">
        <Link href={`/producto/${product.slug}`}>
          <h3>{product.titulo}</h3>
        </Link>
        <p className="oc-price">{formatPriceArs(product.precio)}</p>
        <p className="oc-cuotas">Hasta {cuotas} Cuotas sin interés.</p>
        <p className="oc-contado">Pagando contado 10% de descuento</p>
        {sinImp != null && (
          <p className="oc-sin-imp">Sin imp nacionales: {formatPriceArs(sinImp)}</p>
        )}
        <Link href={`/producto/${product.slug}`} className="oc-btn oc-btn-cart">
          Ver producto
        </Link>
      </div>
    </article>
  );
}
