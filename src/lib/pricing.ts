/** Precios estilo OneClick Store */

export const CONTADO_DISCOUNT = 0.1;
/** Factor aproximado impuestos nacionales (precio con impuestos / sin impuestos) */
export const IMPUESTOS_NACIONALES_FACTOR = 1.105;

export function precioContado(precioLista: number | null | undefined): number | null {
  if (precioLista == null) return null;
  return Math.round(precioLista * (1 - CONTADO_DISCOUNT) * 100) / 100;
}

export function precioSinImpuestos(precioLista: number | null | undefined): number | null {
  if (precioLista == null) return null;
  return Math.round((precioLista / IMPUESTOS_NACIONALES_FACTOR) * 100) / 100;
}

export function formatPriceArs(value: number | null | undefined): string {
  if (value == null) return "Consultar";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
