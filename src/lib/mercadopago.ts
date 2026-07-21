import MercadoPagoConfig, { Payment, Preference } from "mercadopago";

function accessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "Mercado Pago no está configurado. Definí MERCADOPAGO_ACCESS_TOKEN."
    );
  }
  return token;
}

export function isMercadoPagoConfigured(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN?.trim());
}

function client() {
  return new MercadoPagoConfig({
    accessToken: accessToken(),
    options: { timeout: 8_000 },
  });
}

export function mercadoPagoPreference() {
  return new Preference(client());
}

export function mercadoPagoPayment() {
  return new Payment(client());
}

export function publicSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.AUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}
