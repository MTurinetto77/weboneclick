export const SHIPPING_QUOTE_EVENT = "oc-shipping-quote";

export type ShippingQuoteDetail = {
  tipo: "envio" | "retiro";
  codigo_postal: string;
  ok: boolean;
  costo: number;
  gratis: boolean;
  message: string;
  localidad?: string;
  proveedor?: string;
  dias_entrega?: number;
};

let lastQuote: ShippingQuoteDetail | null = null;

/** Emite la cotización a totals/pago y la guarda para listeners que monten después. */
export function emitShippingQuote(detail: ShippingQuoteDetail) {
  lastQuote = detail;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SHIPPING_QUOTE_EVENT, { detail }));
  }
}

export function getLastShippingQuote(): ShippingQuoteDetail | null {
  return lastQuote;
}
