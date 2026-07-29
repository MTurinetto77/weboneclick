"use server";

import { ensureCheckoutIdempotencyKey } from "@/lib/checkout-idempotency";

/** Establece la cookie de idempotencia (solo válido desde Server Action). */
export async function ensureCheckoutIdempotencyKeyAction() {
  await ensureCheckoutIdempotencyKey();
}
