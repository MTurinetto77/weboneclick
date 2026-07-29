"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAddToCart } from "@/components/add-to-cart";

type Props = {
  idProducto: number;
  title: string;
  imageUrl: string;
  priceLabel: string;
  cuotaLabel: string | null;
  maxQty: number;
  /** id del elemento del buybox principal (botón "Añadir al carrito" de arriba)
   *  que se observa para saber cuándo mostrar esta barra. */
  triggerId: string;
};

/** Barra de compra fija que aparece cuando el buybox principal sale de foco al
 *  scrollear — replica el "sticky add to cart" real de oneclickstore.com, con
 *  el efecto glass del kit de diseño (.oc-buybar). */
export function ProductStickyBar({
  idProducto,
  title,
  imageUrl,
  priceLabel,
  cuotaLabel,
  maxQty,
  triggerId,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [qty, setQty] = useState(1);
  const { add, pending, modal } = useAddToCart();
  const max = Math.max(1, maxQty);

  useEffect(() => {
    const trigger = document.getElementById(triggerId);
    if (!trigger) return;
    // Se muestra solo cuando el buybox principal quedó scrolleado por ARRIBA del
    // viewport. Chequeo directo en cada scroll (no IntersectionObserver): con
    // scroll rápido/saltos grandes el observer puede no reportar la transición
    // "abajo → arriba" si nunca queda registrado un frame intermedio intersectando.
    let ticking = false;
    const check = () => {
      setVisible(trigger.getBoundingClientRect().top < 0);
      ticking = false;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [triggerId]);

  return (
    <>
      <div className={`oc-pdp-buybar${visible ? " is-visible" : ""}`} aria-hidden={!visible}>
        <div className="oc-pdp-buybar-inner">
          <div className="oc-pdp-buybar-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" />
          </div>

          <div className="oc-pdp-buybar-title">{title}</div>

          <div className="oc-pdp-buybar-price">
            <div>{priceLabel}</div>
            {cuotaLabel && <span>{cuotaLabel}</span>}
          </div>

          <p className="oc-pdp-buybar-stock">
            <CheckIcon /> Hay existencias
          </p>

          <div className="oc-pdp-qty-controls">
            <button
              type="button"
              aria-label="Menos"
              tabIndex={visible ? 0 : -1}
              onClick={() => setQty((q) => Math.max(1, q - 1))}
            >
              −
            </button>
            <input
              type="number"
              min={1}
              max={max}
              value={qty}
              aria-label="Cantidad"
              tabIndex={visible ? 0 : -1}
              onChange={(e) => {
                const n = Math.floor(Number(e.target.value) || 1);
                setQty(Math.min(max, Math.max(1, n)));
              }}
            />
            <button
              type="button"
              aria-label="Más"
              tabIndex={visible ? 0 : -1}
              onClick={() => setQty((q) => Math.min(max, q + 1))}
            >
              +
            </button>
          </div>

          <button
            type="button"
            className="oc-pdp-buybar-add"
            disabled={pending}
            tabIndex={visible ? 0 : -1}
            onClick={() => add(idProducto, qty)}
          >
            Añadir al carrito
          </button>

          <Link
            href="/lista-deseos"
            className="oc-pdp-buybar-wishlist"
            aria-label="Añadir a lista de deseos"
            tabIndex={visible ? 0 : -1}
          >
            <HeartIcon />
          </Link>
        </div>
      </div>
      {modal}
    </>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 20.5s-7.5-4.6-9.8-9.2C.6 7.8 2.3 4.5 5.7 4c2-.3 4 .6 5.1 2.3l1.2 1.8 1.2-1.8C14.3 4.6 16.3 3.7 18.3 4c3.4.5 5.1 3.8 3.5 7.3-2.3 4.6-9.8 9.2-9.8 9.2z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
