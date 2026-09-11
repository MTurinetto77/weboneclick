"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addToCartWithSummary,
  type AddToCartSummary,
} from "@/app/(shop)/carrito/actions";
import { trackAddToCart } from "@/lib/analytics";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

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
      if (res.ok) {
        trackAddToCart({
          item_id: String(res.id_producto),
          item_name: res.titulo,
          quantity: res.cantidad,
          price: res.precio,
        });
      }
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
  useBodyScrollLock(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
      <header className="oc-atc-head">
        <span className="oc-atc-badge">
          <CheckIcon />
        </span>
        <p className="oc-atc-head-title">Agregado al carrito</p>
        <button type="button" className="oc-atc-close" onClick={onClose} aria-label="Cerrar">
          <CloseIcon />
        </button>
      </header>

      <div className="oc-atc-body">
        <div className="oc-atc-item">
          <div className="oc-atc-item-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={summary.imagen || "/placeholder-product.svg"} alt={summary.titulo} />
          </div>
          <div className="oc-atc-item-info">
            <p className="oc-atc-item-title">{summary.titulo}</p>
            <p className="oc-atc-item-meta">Cantidad: {summary.cantidad}</p>
          </div>
          <p className="oc-atc-item-price">{formatArs(summary.precio)}</p>
        </div>

        <div className="oc-atc-subtotal">
          <span>
            Subtotal · {summary.itemCount} {summary.itemCount === 1 ? "producto" : "productos"}
          </span>
          <strong>{formatArs(summary.subtotal)}</strong>
        </div>

        <div className="oc-atc-actions">
          <Link href="/checkout" className="oc-atc-cta oc-atc-cta-primary">
            Finalizar compra
          </Link>
          <Link href="/carrito" className="oc-atc-cta oc-atc-cta-ghost">
            Ver carrito
          </Link>
        </div>

        <button type="button" className="oc-atc-continue" onClick={onClose}>
          Seguir comprando
        </button>
      </div>

      {summary.related.length > 0 && (
        <div className="oc-atc-related">
          <h4>Completá tu compra</h4>
          <ul className="oc-atc-related-list">
            {summary.related.map((r) => (
              <li key={r.id_producto} className="oc-atc-related-item">
                <Link href={`/producto/${r.slug}`} className="oc-atc-related-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.imagen || "/placeholder-product.svg"} alt={r.titulo} />
                </Link>
                <div className="oc-atc-related-info">
                  <Link
                    href={`/producto/${r.slug}`}
                    className="oc-atc-related-title"
                    title={r.titulo}
                  >
                    {r.titulo}
                  </Link>
                  <p className="oc-atc-related-price">{formatArs(r.precio)}</p>
                </div>
                <button
                  type="button"
                  className="oc-atc-related-add"
                  disabled={pending}
                  onClick={() => onAdd(r.id_producto)}
                  aria-label={`Agregar ${r.titulo} al carrito`}
                  title="Agregar al carrito"
                >
                  <PlusIcon />
                </button>
              </li>
            ))}
          </ul>
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

function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
