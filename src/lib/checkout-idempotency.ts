import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { shopCookieOptions } from "@/lib/cookie-options";

export const CHECKOUT_IDEM_COOKIE = "checkout_idem";
const MAX_AGE = 60 * 60 * 6; // 6 h

/** Asegura una clave de idempotencia en cookie httpOnly (no confiar en el cliente). */
export async function ensureCheckoutIdempotencyKey(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(CHECKOUT_IDEM_COOKIE)?.value?.trim();
  if (existing && existing.length >= 16 && existing.length <= 64) {
    return existing;
  }
  const key = randomUUID();
  jar.set(CHECKOUT_IDEM_COOKIE, key, shopCookieOptions(MAX_AGE));
  return key;
}

/** Lee la clave de idempotencia del servidor; ignora valores enviados por el cliente. */
export async function readCheckoutIdempotencyKey(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(CHECKOUT_IDEM_COOKIE)?.value?.trim() || null;
  if (!value || value.length < 16 || value.length > 64) return null;
  return value;
}

export async function clearCheckoutIdempotencyKey(): Promise<void> {
  const jar = await cookies();
  jar.delete(CHECKOUT_IDEM_COOKIE);
}

/** Rota la clave tras crear/cerrar un pedido para evitar reuso. */
export async function rotateCheckoutIdempotencyKey(): Promise<void> {
  const jar = await cookies();
  jar.set(CHECKOUT_IDEM_COOKIE, randomUUID(), shopCookieOptions(MAX_AGE));
}
