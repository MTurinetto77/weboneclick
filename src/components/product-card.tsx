import Link from "next/link";
import { AddToCartButton } from "@/components/add-to-cart";
import { formatPriceArs, precioSinImpuestos } from "@/lib/pricing";
import { uploadPublicUrl } from "@/lib/utils";
import type { ProductListItem } from "@/lib/products";

/** Card de producto estilo OneClick (cuotas en rojo + CTA animado). */
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
        <div className="oc-add-form">
          <AddToCartButton idProducto={product.id_producto} className="oc-btn oc-btn-cart">
            <span className="oc-btn-cart-label">Agregar al carrito</span>
            <span className="oc-btn-cart-icon" aria-hidden>
              <CartBagIcon />
            </span>
          </AddToCartButton>
        </div>
      </div>
    </article>
  );
}

function CartBagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 8h12l-1 12H7L6 8z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 8V7a3 3 0 016 0v1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
