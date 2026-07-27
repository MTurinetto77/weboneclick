"use client";

import { useState, useTransition } from "react";
import {
  aplicarCuponAction,
  quitarCuponAction,
} from "@/app/(shop)/cupon-actions";

type Props = {
  appliedCodigo?: string | null;
  appliedMonto?: number | null;
};

function formatArs(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Bloque de cupón estilo WooCommerce ("¿Tienes un cupón?").
 * No usa <form> porque vive dentro del form del checkout.
 */
export function CheckoutCoupon({ appliedCodigo, appliedMonto }: Props) {
  const [open, setOpen] = useState(!!appliedCodigo);
  const [code, setCode] = useState(appliedCodigo || "");
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(!!appliedCodigo);
  const [pending, startTransition] = useTransition();

  function apply() {
    startTransition(async () => {
      const result = await aplicarCuponAction(code);
      if (result.ok) {
        setOk(true);
        setCode(result.codigo);
        setMsg(`Cupón ${result.codigo} aplicado (−${formatArs(result.monto)})`);
      } else {
        setOk(false);
        setMsg(result.message);
      }
    });
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
          {appliedCodigo && appliedMonto != null && appliedMonto > 0 ? (
            <div className="oc-checkout-coupon-row" style={{ alignItems: "center" }}>
              <p style={{ margin: 0, flex: 1 }}>
                Cupón <strong>{appliedCodigo}</strong> (−{formatArs(appliedMonto)})
              </p>
              <button
                type="button"
                className="oc-btn oc-btn-ghost-dark"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    await quitarCuponAction();
                    setOk(false);
                    setMsg(null);
                    setCode("");
                  });
                }}
              >
                Quitar
              </button>
            </div>
          ) : (
            <>
              <p>Si tienes un código de cupón, aplícalo a continuación.</p>
              <div className="oc-checkout-coupon-row">
                <input
                  type="text"
                  value={code}
                  placeholder="Código de cupón"
                  autoComplete="off"
                  disabled={pending}
                  onChange={(e) => {
                    setCode(e.target.value);
                    setMsg(null);
                    setOk(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      apply();
                    }
                  }}
                />
                <button
                  type="button"
                  className="oc-btn oc-btn-dark"
                  disabled={pending}
                  onClick={apply}
                >
                  Aplicar cupón
                </button>
              </div>
            </>
          )}
          {msg && (
            <p
              className="oc-checkout-coupon-msg"
              style={ok ? { color: "#1b5e20" } : undefined}
            >
              {msg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
