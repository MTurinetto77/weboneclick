"use client";

import { useEffect, useState } from "react";

/** Campo oculto con clave de idempotencia generada una vez por sesión de checkout. */
export function CheckoutIdempotencyKey() {
  const [key, setKey] = useState("");

  useEffect(() => {
    setKey(crypto.randomUUID());
  }, []);

  if (!key) return null;
  return <input type="hidden" name="idempotency_key" value={key} readOnly />;
}
