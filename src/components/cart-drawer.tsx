"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { removeFromCart } from "@/app/(shop)/carrito/actions";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

export type CartDrawerItem = {
  id_producto: number;
  titulo: string;
  cantidad: number;
  precio: number | null;
  imagen: string | null;
  subtotal: number | null;
  disponible: boolean;
};

type Props = {
  items: CartDrawerItem[];
  subtotal: number;
  canCheckout: boolean;
  valorEnvioGratis: number;
};

export function CartTrigger({
  itemCount,
  className,
}: {
  itemCount: number;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`oc-icon-btn oc-icon-btn-flat nav-cart${className ? ` ${className}` : ""}`}
      aria-label="Carrito"
      onClick={() => window.dispatchEvent(new Event("oc:cart-open"))}
    >
      <BagIcon />
      <span className="cart-badge">{itemCount}</span>
    </button>
  );
}

function formatArs(value: number | null): string {
  if (value == null) return "Consultar";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

export function CartDrawer({
  items,
  subtotal,
  canCheckout,
  valorEnvioGratis,
}: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const remainingForFreeShip = Math.max(0, valorEnvioGratis - subtotal);
  const freeShipProgress = Math.min(
    100,
    subtotal > 0 && valorEnvioGratis > 0 ? (subtotal / valorEnvioGratis) * 100 : 0,
  );
  const hasFreeShipping = remainingForFreeShip <= 0 && subtotal > 0;

  // Cerrar al navegar a otra página
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Permite abrir el drawer desde el trigger del header mobile
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("oc:cart-open", handler);
    return () => window.removeEventListener("oc:cart-open", handler);
  }, []);

  // Bloquear scroll del body con el drawer abierto + cerrar con Escape
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div
        className={`oc-cart-overlay${open ? " oc-cart-overlay-open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden
      />

      <aside
        className={`oc-cart-drawer${open ? " oc-cart-drawer-open" : ""}`}
        role="dialog"
        aria-label="Carro de compras"
        aria-hidden={!open}
      >
        <header className="oc-cart-drawer-head">
          <h2>Carro de Compras</h2>
          <button
            type="button"
            className="oc-cart-drawer-close"
            onClick={() => setOpen(false)}
          >
            <CloseIcon />
            <span>Cerrar</span>
          </button>
        </header>

        {items.length === 0 ? (
          <div className="oc-cart-drawer-empty">
            <span className="oc-cart-drawer-empty-icon" aria-hidden>
              <EmptyCartIcon />
            </span>
            <p>No hay productos en el carrito.</p>
            <button
              type="button"
              className="oc-btn oc-btn-dark"
              onClick={() => setOpen(false)}
            >
              Volver a la Tienda
            </button>
          </div>
        ) : (
          <>
            <div className="oc-cart-shipping oc-cart-shipping-drawer">
              {hasFreeShipping ? (
                <p>¡Ya tienes envío gratis disponible!</p>
              ) : (
                <p>
                  ¡Te faltan <strong>{formatArs(remainingForFreeShip)}</strong> para
                  obtener envío gratis!
                </p>
              )}
              <div
                className="oc-cart-shipping-bar"
                role="progressbar"
                aria-valuenow={Math.round(freeShipProgress)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span style={{ width: `${freeShipProgress}%` }} />
              </div>
            </div>

            <ul className="oc-cart-drawer-list">
              {items.map((item) => (
                <li key={item.id_producto} className="oc-cart-drawer-item">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imagen || "/placeholder-product.svg"}
                    alt={item.titulo}
                  />
                  <div className="oc-cart-drawer-item-info">
                    <p className="oc-cart-drawer-item-title">{item.titulo}</p>
                    <p className="oc-cart-drawer-item-qty">
                      {item.cantidad} × {formatArs(item.precio)}
                    </p>
                    {!item.disponible && (
                      <p className="oc-cart-drawer-item-warn">Sin stock disponible</p>
                    )}
                  </div>
                  <form action={removeFromCart}>
                    <input type="hidden" name="id_producto" value={item.id_producto} />
                    <button
                      type="submit"
                      className="oc-cart-drawer-item-remove"
                      aria-label={`Quitar ${item.titulo}`}
                    >
                      <CloseIcon />
                    </button>
                  </form>
                </li>
              ))}
            </ul>

            <footer className="oc-cart-drawer-foot">
              <p className="oc-cart-drawer-total">
                <span>Total:</span>
                <strong>{formatArs(subtotal)}</strong>
              </p>
              <div className="oc-cart-drawer-actions">
                <Link href="/carrito" className="oc-btn oc-btn-ghost-dark">
                  Ver Carro
                </Link>
                {canCheckout ? (
                  <Link href="/checkout" className="oc-btn oc-btn-dark">
                    Pagar Ahora!
                  </Link>
                ) : (
                  <button type="button" className="oc-btn oc-btn-dark" disabled>
                    Pagar Ahora!
                  </button>
                )}
              </div>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}

export function BagIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 8h12l-1 12H7L6 8z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 8V7a3 3 0 016 0v1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
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
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EmptyCartIcon() {
  return (
    <svg width="110" height="110" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 4h2l2.2 11h10.3l1.8-7"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="19.5" r="1.4" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="16" cy="19.5" r="1.4" stroke="currentColor" strokeWidth="1.1" />
      <path
        d="M13 4l4 4m0-4l-4 4"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}
