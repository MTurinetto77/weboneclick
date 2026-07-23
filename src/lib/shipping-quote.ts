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
