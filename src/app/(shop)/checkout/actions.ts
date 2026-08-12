"use server";

/**
 * @deprecated El checkout paga vía POST /api/mercadopago/preference (Wallet)
 * y /api/mercadopago/pay (Card Brick). No usar redirect externo desde server
 * action: Next intenta parsear el HTML de MP como respuesta RSC/JSON.
 */
export async function confirmarVenta(_formData: FormData) {
  throw new Error(
    "El checkout ya no usa este action. Usá Mercado Pago (Wallet) o el formulario de tarjeta.",
  );
}
