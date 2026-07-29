"use client";

import { useEffect } from "react";
import { ensureCheckoutIdempotencyKeyAction } from "@/app/(shop)/checkout/idempotency-action";

/** Dispara el Server Action que setea la cookie httpOnly de idempotencia. */
export function CheckoutIdempotencyBootstrap() {
  useEffect(() => {
    void ensureCheckoutIdempotencyKeyAction();
  }, []);
  return null;
}
