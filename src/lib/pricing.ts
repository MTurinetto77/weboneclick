/** Precios estilo OneClick Store */

export const CONTADO_DISCOUNT = 0.1;
/** Factor aproximado impuestos nacionales (precio con impuestos / sin impuestos) */
export const IMPUESTOS_NACIONALES_FACTOR = 1.105;

/** Cuotas sin interés habituales en AR; se recortan al tope del producto. */
const CUOTAS_SIN_INTERES = [1, 3, 6, 9, 12, 18, 24];

/**
 * Opciones de cuotas a mostrar en el Brick y a enviar a Mercado Pago:
 * 1, 3, 6… hasta `max`, incluyendo siempre el tope del producto.
 */
export function installmentOptions(max: number): number[] {
  const cap = Math.max(1, Math.floor(max) || 12);
  const opts = CUOTAS_SIN_INTERES.filter((n) => n <= cap);
  if (!opts.includes(1)) opts.unshift(1);
  if (!opts.includes(cap)) opts.push(cap);
  return opts;
}

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
