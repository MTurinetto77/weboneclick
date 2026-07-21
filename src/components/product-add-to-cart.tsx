"use client";

import { useState } from "react";
import { useAddToCart } from "@/components/add-to-cart";

type Props = {
  idProducto: number;
  maxQty?: number;
};

export function ProductAddToCart({ idProducto, maxQty = 99 }: Props) {
  const [qty, setQty] = useState(1);
  const max = Math.max(1, maxQty);
  const { add, pending, modal } = useAddToCart();

  return (
    <div className="oc-pdp-cart-form">
      <div className="oc-pdp-qty">
        <label htmlFor={`qty-${idProducto}`}>Cantidad</label>
        <div className="oc-pdp-qty-controls">
          <button
            type="button"
            aria-label="Menos"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
          >
            −
          </button>
          <input
            id={`qty-${idProducto}`}
            name="cantidad"
            type="number"
            min={1}
            max={max}
            value={qty}
            onChange={(e) => {
              const n = Math.floor(Number(e.target.value) || 1);
              setQty(Math.min(max, Math.max(1, n)));
            }}
          />
          <button
            type="button"
            aria-label="Más"
            onClick={() => setQty((q) => Math.min(max, q + 1))}
          >
            +
          </button>
        </div>
      </div>
      <button
        type="button"
        className="oc-btn oc-btn-primary oc-pdp-add-btn"
        disabled={pending}
        onClick={() => add(idProducto, qty)}
      >
        Añadir al carrito
      </button>
      {modal}
    </div>
  );
}
