/** Precios estilo OneClick Store */

/** Factor aproximado impuestos nacionales (precio con impuestos / sin impuestos) */
export const IMPUESTOS_NACIONALES_FACTOR = 1.105;

/**
 * Cuotas sin interés cuando el producto no trae tope propio (`cuotas_max`).
 * Hoy ningún producto lo trae desde Odoo, así que este valor es el que se
 * muestra en toda la web y el que topea el checkout.
 */
export const DEFAULT_CUOTAS_MAX = 18;

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

/**
 * Descuento contado solo si el producto tiene cuotas definidas (> 0)
 * y cuotas_max >= umbral. Sin cuotas definidas → no califica.
 */
export function productoCalificaDescuentoContado(
  cuotasMax: number | null | undefined,
  umbralCuotas: number,
): boolean {
  if (cuotasMax == null || cuotasMax <= 0) return false;
  return cuotasMax >= umbralCuotas;
}

/** Convierte porcentaje (20 = 20%) a factor de descuento (0.2). */
export function factorDescuentoContado(porcentaje: number): number {
  if (!Number.isFinite(porcentaje) || porcentaje <= 0) return 0;
  return Math.min(porcentaje, 100) / 100;
}

export function precioContado(
  precioLista: number | null | undefined,
  porcentaje: number,
): number | null {
  if (precioLista == null) return null;
  const factor = factorDescuentoContado(porcentaje);
  return Math.round(precioLista * (1 - factor) * 100) / 100;
}

/** Texto de la opción Contado en checkout (título corto). */
export function labelModoContado(opts: {
  porcentaje: number;
  descuentoMonto: number;
  parcial: boolean;
}): string {
  if (opts.descuentoMonto <= 0) return "Contado";
  if (opts.parcial) {
    return `Contado — ${opts.porcentaje}% en productos elegibles`;
  }
  return `Contado — ${opts.porcentaje}% de descuento`;
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
