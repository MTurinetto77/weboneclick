"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addToCartWithSummary,
  type AddToCartSummary,
} from "@/app/(shop)/carrito/actions";

function formatArs(value: number | null): string {
  if (value == null) return "Consultar";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

/** Estado compartido: agrega al carrito y muestra el popup "producto agregado". */
export function useAddToCart() {
  const [summary, setSummary] = useState<AddToCartSummary | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function add(id_producto: number, cantidad = 1) {
    startTransition(async () => {
      const res = await addToCartWithSummary({ id_producto, cantidad });
      setSummary(res);
      router.refresh();
    });
  }

  const modal = summary ? (
    <AddedToCartModal
      summary={summary}
      pending={pending}
      onClose={() => setSummary(null)}
      onAdd={(id) => add(id, 1)}
    />
  ) : null;

  return { add, pending, modal };
}

/** Botón "Agregar al carrito" que abre el popup al agregar. */
export function AddToCartButton({
  idProducto,
  cantidad = 1,
  className,
  children,
  disabled = false,
}: {
  idProducto: number;
  cantidad?: number;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const { add, pending, modal } = useAddToCart();

  return (
    <>
      <button
        type="button"
        className={className}
        disabled={disabled || pending}
        onClick={() => add(idProducto, cantidad)}
      >
        {children}
      </button>
      {modal}
    </>
  );
}

function AddedToCartModal({
  summary,
  pending,
  onClose,
  onAdd,
}: {
  summary: AddToCartSummary;
  pending: boolean;
  onClose: () => void;
  onAdd: (id_producto: number) => void;
}) {
  // Bloquear scroll + cerrar con Escape
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const body = !summary.ok ? (
    <div className="oc-atc-modal oc-atc-modal-error" onClick={(e) => e.stopPropagation()}>
      <button type="button" className="oc-atc-close" onClick={onClose} aria-label="Cerrar">
        <CloseIcon />
      </button>
      <p>{summary.error}</p>
    </div>
  ) : (
    <div className="oc-atc-modal" onClick={(e) => e.stopPropagation()}>
      <button type="button" className="oc-atc-close" onClick={onClose} aria-label="Cerrar">
        <CloseIcon />
      </button>

      <div className="oc-atc-hero">
        <div className="oc-atc-hero-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={summary.imagen || "/placeholder-product.svg"} alt={summary.titulo} />
        </div>
        <div className="oc-atc-hero-info">
          <h3>El producto se ha agregado a tu compra!</h3>
          <p className="oc-atc-cart-line">
            Tu carro actual (<strong>{summary.itemCount}</strong>{" "}
            {summary.itemCount === 1 ? "item" : "items"}):{" "}
            <strong>{formatArs(summary.subtotal)}</strong>
          </p>
          <div className="oc-atc-actions">
            <Link href="/carrito" className="oc-btn oc-btn-dark">
              Ver Carro
            </Link>
            <button type="button" className="oc-btn oc-btn-dark" onClick={onClose}>
              Continuar
            </button>
            <Link href="/checkout" className="oc-btn oc-btn-red">
              Pagar Ahora!
            </Link>
          </div>
          <p className="oc-atc-meta">
            Cantidad: <strong>{summary.cantidad}</strong>
          </p>
          <p className="oc-atc-meta">Total: {formatArs(summary.subtotal)}</p>
        </div>
      </div>

      {summary.related.length > 0 && (
        <div className="oc-atc-related">
          <h4>
            Generalmente se compran junto con <strong>{summary.titulo}</strong>
          </h4>
          <div className="oc-atc-related-row">
            {summary.related.map((r) => (
              <article key={r.id_producto} className="oc-atc-related-card">
                <Link href={`/producto/${r.slug}`} className="oc-atc-related-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.imagen || "/placeholder-product.svg"} alt={r.titulo} />
                </Link>
                <p className="oc-atc-related-title" title={r.titulo}>
                  {r.titulo}
                </p>
                <p className="oc-atc-related-price">{formatArs(r.precio)}</p>
                <button
                  type="button"
                  className="oc-atc-related-add"
                  disabled={pending}
                  onClick={() => onAdd(r.id_producto)}
                >
                  Añadir al carrito
                </button>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(
    <div className="oc-atc-overlay" onClick={onClose} role="dialog" aria-modal="true">
      {body}
    </div>,
    document.body
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
