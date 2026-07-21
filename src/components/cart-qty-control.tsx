"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateQuantity } from "@/app/(shop)/carrito/actions";

type Props = {
  idProducto: number;
  cantidad: number;
  maxQty: number;
};

/** Selector − / cantidad / + estilo OneClick Store. */
export function CartQtyControl({ idProducto, cantidad, maxQty }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const max = Math.max(1, maxQty);

  function setQty(next: number) {
    const capped = Math.min(max, Math.max(0, Math.floor(next)));
    const fd = new FormData();
    fd.set("id_producto", String(idProducto));
    fd.set("cantidad", String(capped));
    startTransition(async () => {
      await updateQuantity(fd);
      router.refresh();
    });
  }

  return (
    <div className={`oc-cart-qty${pending ? " is-pending" : ""}`}>
      <button
        type="button"
        aria-label="Disminuir cantidad"
        disabled={pending || cantidad <= 1}
        onClick={() => setQty(cantidad - 1)}
      >
        −
      </button>
      <span aria-live="polite">{cantidad}</span>
      <button
        type="button"
        aria-label="Aumentar cantidad"
        disabled={pending || cantidad >= max}
        onClick={() => setQty(cantidad + 1)}
      >
        +
      </button>
    </div>
  );
}
