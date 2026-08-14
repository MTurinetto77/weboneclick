export const MODO_COBRO_EVENT = "oc-modo-cobro";

export type ModoCobroCheckout = "contado" | "cuotas";

let lastModoCobro: ModoCobroCheckout = "contado";

export function getLastModoCobro(): ModoCobroCheckout {
  return lastModoCobro;
}

export function setModoCobro(modo: ModoCobroCheckout) {
  lastModoCobro = modo;
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(MODO_COBRO_EVENT, { detail: { modo } }),
  );
}
