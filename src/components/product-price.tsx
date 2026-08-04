import { formatPriceArs } from "@/lib/pricing";
import { precioEfectivo } from "@/lib/products";

type ProductPriceProps = {
  precio: number | null;
  porcentaje_desc?: number | null;
  precio_con_desc?: number | null;
  /** Clase del contenedor cuando hay descuento. */
  className?: string;
};

/** Precio de lista; si hay promo: tachado + % + precio con descuento. */
export function ProductPrice({
  precio,
  porcentaje_desc,
  precio_con_desc,
  className,
}: ProductPriceProps) {
  const efectivo = precioEfectivo(precio, precio_con_desc);
  const hasDiscount =
    porcentaje_desc != null &&
    porcentaje_desc > 0 &&
    precio_con_desc != null &&
    precio != null &&
    precio_con_desc < precio;

  if (!hasDiscount) {
    return <p className={className ?? "oc-price"}>{formatPriceArs(efectivo)}</p>;
  }

  const pctLabel =
    Number.isInteger(porcentaje_desc) || porcentaje_desc % 1 === 0
      ? String(Math.round(porcentaje_desc))
      : porcentaje_desc.toFixed(1).replace(/\.0$/, "");

  return (
    <div className={className ?? "oc-price-block"}>
      <p className="oc-price-old">{formatPriceArs(precio)}</p>
      <p className="oc-price-row">
        <span className="oc-price-pct">−{pctLabel}%</span>
        <span className="oc-price oc-price-sale">{formatPriceArs(precio_con_desc)}</span>
      </p>
    </div>
  );
}
