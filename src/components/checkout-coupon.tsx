"use client";

import { useState } from "react";

/**
 * Bloque de cupón estilo WooCommerce ("¿Tienes un cupón?").
 * No usa <form> porque vive dentro del form del checkout.
 */
export function CheckoutCoupon() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  function apply() {
    setMsg(
      code.trim()
        ? "El cupón no es válido o ya no está vigente."
        : "Ingresá un código de cupón."
    );
  }

  return (
    <div className="oc-checkout-coupon">
      <p className="oc-checkout-coupon-toggle">
        <strong>¿Tienes un cupón?</strong>{" "}
        <button type="button" onClick={() => setOpen((v) => !v)}>
          Haz clic aquí para introducir tu código
        </button>
      </p>
      {open && (
        <div className="oc-checkout-coupon-panel">
          <p>Si tienes un código de cupón, aplícalo a continuación.</p>
          <div className="oc-checkout-coupon-row">
            <input
              type="text"
              value={code}
              placeholder="Código de cupón"
              autoComplete="off"
              onChange={(e) => {
                setCode(e.target.value);
                setMsg(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  apply();
                }
              }}
            />
            <button type="button" className="oc-btn oc-btn-dark" onClick={apply}>
              Aplicar cupón
            </button>
          </div>
          {msg && <p className="oc-checkout-coupon-msg">{msg}</p>}
        </div>
      )}
    </div>
  );
}
