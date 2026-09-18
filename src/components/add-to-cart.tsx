"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addMultipleToCartWithSummary,
  addToCartWithSummary,
  type AddToCartSummary,
  type CartRelatedProduct,
} from "@/app/(shop)/carrito/actions";
import { trackAddToCart } from "@/lib/analytics";

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
  const [bundleOpen, setBundleOpen] = useState(false);
  const [bundleAdded, setBundleAdded] = useState<CartRelatedProduct[]>([]);
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
        setBundleAdded([]);
        setBundleOpen(res.opcionales.length > 0);
      } else {
        setBundleOpen(false);
        setBundleAdded([]);
      }
      setSummary(res);
      router.refresh();
    });
  }

  function closeAll() {
    setBundleOpen(false);
    setBundleAdded([]);
    setSummary(null);
  }

  function closeBundle() {
    setBundleOpen(false);
  }

  function confirmBundle(selectedIds: number[]) {
    if (!selectedIds.length) {
      setBundleOpen(false);
      return;
    }
    const selectedProducts =
      summary?.ok
        ? summary.opcionales.filter((p) => selectedIds.includes(p.id_producto))
        : [];
    startTransition(async () => {
      const res = await addMultipleToCartWithSummary({ ids: selectedIds });
      if (res.ok) {
        setBundleAdded(selectedProducts);
        for (const p of selectedProducts) {
          trackAddToCart({
            item_id: String(p.id_producto),
            item_name: p.titulo,
            quantity: 1,
            price: p.precio,
          });
        }
        setSummary((prev) =>
          prev?.ok
            ? {
                ...prev,
                itemCount: res.itemCount,
                subtotal: res.subtotal,
                opcionales: [],
              }
            : prev
        );
      }
      setBundleOpen(false);
      router.refresh();
    });
  }

  const modal = summary ? (
    <>
      <AddedToCartModal
        summary={summary}
        pending={pending}
        bundleAdded={bundleAdded}
        onClose={closeAll}
        onAdd={(id) => add(id, 1)}
        suppressEscape={bundleOpen}
        suppressOverlayClose={bundleOpen}
      />
      {bundleOpen && summary.ok && summary.opcionales.length > 0 && (
        <OptionalBundleModal
          products={summary.opcionales}
          pending={pending}
          onOmit={closeBundle}
          onAdd={confirmBundle}
        />
      )}
    </>
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
  bundleAdded,
  onClose,
  onAdd,
  suppressEscape = false,
  suppressOverlayClose = false,
}: {
  summary: AddToCartSummary;
  pending: boolean;
  bundleAdded: CartRelatedProduct[];
  onClose: () => void;
  onAdd: (id_producto: number) => void;
  suppressEscape?: boolean;
  suppressOverlayClose?: boolean;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !suppressEscape) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, suppressEscape]);

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

      {bundleAdded.length > 0 && (
        <div className="oc-atc-bundle-added">
          <h4>
            {bundleAdded.length === 1
              ? "También agregamos este producto"
              : `También agregamos ${bundleAdded.length} productos`}
          </h4>
          <ul className="oc-atc-bundle-added-list">
            {bundleAdded.map((p) => (
              <li key={p.id_producto} className="oc-atc-bundle-added-item">
                <span className="oc-atc-bundle-added-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.imagen || "/placeholder-product.svg"} alt="" />
                </span>
                <span className="oc-atc-bundle-added-info">
                  <span className="oc-atc-bundle-added-name" title={p.titulo}>
                    {p.titulo}
                  </span>
                  <span className="oc-atc-bundle-added-price">{formatArs(p.precio)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

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
                {r.precio == null ? (
                  <Link href={`/producto/${r.slug}`} className="oc-atc-related-add">
                    Consultar
                  </Link>
                ) : (
                  <>
                    <p className="oc-atc-related-price">{formatArs(r.precio)}</p>
                    <button
                      type="button"
                      className="oc-atc-related-add"
                      disabled={pending}
                      onClick={() => onAdd(r.id_producto)}
                    >
                      Añadir al carrito
                    </button>
                  </>
                )}
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(
    <div
      className="oc-atc-overlay"
      onClick={suppressOverlayClose ? undefined : onClose}
      role="dialog"
      aria-modal="true"
    >
      {body}
    </div>,
    document.body
  );
}

function OptionalBundleModal({
  products,
  pending,
  onOmit,
  onAdd,
}: {
  products: CartRelatedProduct[];
  pending: boolean;
  onOmit: () => void;
  onAdd: (ids: number[]) => void;
}) {
  const [selected, setSelected] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(products.map((p) => [p.id_producto, true]))
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onOmit();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onOmit]);

  function toggle(id: number) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleAdd() {
    const ids = products.filter((p) => selected[p.id_producto]).map((p) => p.id_producto);
    onAdd(ids);
  }

  return createPortal(
    <div
      className="oc-atc-overlay oc-atc-bundle-overlay"
      onClick={onOmit}
      role="dialog"
      aria-modal="true"
      aria-labelledby="oc-atc-bundle-title"
    >
      <div className="oc-atc-modal oc-atc-bundle-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="oc-atc-close" onClick={onOmit} aria-label="Cerrar">
          <CloseIcon />
        </button>

        <h3 id="oc-atc-bundle-title" className="oc-atc-bundle-title">
          Te recomendamos llevar tambien
        </h3>

        <ul className="oc-atc-bundle-list">
          {products.map((p) => (
            <li key={p.id_producto} className="oc-atc-bundle-item">
              <label className="oc-atc-bundle-label">
                <input
                  type="checkbox"
                  className="oc-atc-bundle-check"
                  checked={Boolean(selected[p.id_producto])}
                  onChange={() => toggle(p.id_producto)}
                  disabled={pending}
                />
                <span className="oc-atc-bundle-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.imagen || "/placeholder-product.svg"} alt="" />
                </span>
                <span className="oc-atc-bundle-info">
                  <span className="oc-atc-bundle-name" title={p.titulo}>
                    {p.titulo}
                  </span>
                  <span className="oc-atc-bundle-price">{formatArs(p.precio)}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>

        <div className="oc-atc-bundle-actions">
          <button
            type="button"
            className="oc-btn oc-btn-red"
            disabled={pending}
            onClick={handleAdd}
          >
            Agregar
          </button>
          <button
            type="button"
            className="oc-btn oc-btn-dark"
            disabled={pending}
            onClick={onOmit}
          >
            Omitir
          </button>
        </div>
      </div>
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
