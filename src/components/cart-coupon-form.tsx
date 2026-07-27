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

/** Cupón del carrito: valida y persiste en cookie. */
export function CartCouponForm({ appliedCodigo, appliedMonto }: Props) {
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="oc-cart-coupon">
      {appliedCodigo && appliedMonto != null && appliedMonto > 0 ? (
        <div className="oc-cart-coupon-applied">
          <p>
            Cupón <strong>{appliedCodigo}</strong> aplicado (−
            {formatArs(appliedMonto)})
          </p>
          <button
            type="button"
            className="oc-btn oc-btn-ghost-dark"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                await quitarCuponAction();
                setMsg(null);
                setOk(false);
              });
            }}
          >
            Quitar
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const code = String(new FormData(e.currentTarget).get("cupon") || "");
            startTransition(async () => {
              const result = await aplicarCuponAction(code);
              if (result.ok) {
                setOk(true);
                setMsg(`Cupón ${result.codigo} aplicado (−${formatArs(result.monto)})`);
              } else {
                setOk(false);
                setMsg(result.message);
              }
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
          {msg && (
            <p
              className="oc-cart-coupon-msg"
              style={ok ? { color: "#1b5e20" } : undefined}
            >
              {msg}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
