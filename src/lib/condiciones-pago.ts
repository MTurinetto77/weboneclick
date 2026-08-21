/**
 * Condiciones de pago que se muestran en el PDP (modal "Condiciones de pago").
 *
 * IMPORTANTE: los coeficientes de financiación son PROVISORIOS. Son valores de
 * referencia ("CAP") hasta que se definan las tasas reales con los bancos /
 * Mercado Pago. Cuando cambien, se toca únicamente COEFICIENTE_CUOTA y se
 * actualiza todo el sitio.
 *
 * Regla: los planes menores o iguales a `cuotas_max` del producto van sin
 * interés (es lo que ya publica el badge del PDP); los planes más largos usan
 * el coeficiente de esta tabla.
 */

export const CUOTAS_DISPONIBLES = [3, 6, 12, 18, 24] as const;

/**
 * Coeficiente sobre el precio de lista para los planes que superan las cuotas
 * sin interés del producto. PROVISORIO: valores de referencia hasta tener las
 * tasas reales. Todo plan listado tiene que tener coeficiente > 1, para que un
 * plan más largo que `cuotas_max` nunca se muestre como "sin interés".
 */
export const COEFICIENTE_CUOTA: Record<number, number> = {
  3: 1.06,
  6: 1.12,
  12: 1.24,
  18: 1.38,
  24: 1.52,
};

export const LEGAL_CONDICIONES_PAGO =
  "Los planes de cuotas dependen del banco y de la tarjeta emisora. Los importes son estimados y se confirman al finalizar la compra.";

export type PlanCuotas = {
  cuotas: number;
  sinInteres: boolean;
  /** Importe de cada cuota (null si el producto no tiene precio publicado). */
  montoCuota: number | null;
  /** Total financiado (null si no hay precio). */
  total: number | null;
  /** Recargo sobre el precio de lista, en % (0 si es sin interés). */
  recargoPct: number;
};

export function buildPlanesCuotas(
  precio: number | null,
  cuotasSinInteres: number,
): PlanCuotas[] {
  return CUOTAS_DISPONIBLES.map((cuotas) => {
    const coef = cuotas <= cuotasSinInteres ? 1 : (COEFICIENTE_CUOTA[cuotas] ?? 1);
    const total = precio != null ? precio * coef : null;
    return {
      cuotas,
      sinInteres: coef === 1,
      montoCuota: total != null ? total / cuotas : null,
      total,
      recargoPct: Math.round((coef - 1) * 1000) / 10,
    };
  });
}
