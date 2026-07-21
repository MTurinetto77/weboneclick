"use client";

import { useState, useTransition } from "react";

/** Cupón visual (paridad con el carrito original). */
export function CartCouponForm() {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="oc-cart-coupon"
      onSubmit={(e) => {
        e.preventDefault();
        const code = new FormData(e.currentTarget).get("cupon");
        startTransition(() => {
          setMsg(
            String(code || "").trim()
              ? "El cupón no es válido o ya no está vigente."
              : "Ingresá un código de cupón."
          );
        });
      }}
    >
      <input
        name="cupon"
        type="text"
        placeholder="Código de cupón"
        autoComplete="off"
        disabled={pending}
      />
      <button type="submit" className="oc-btn oc-btn-dark" disabled={pending}>
        Aplicar cupón
      </button>
      {msg && <p className="oc-cart-coupon-msg">{msg}</p>}
    </form>
  );
}
