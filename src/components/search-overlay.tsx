"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { MAIN_NAV } from "@/lib/nav";

const QUICK_LINKS = MAIN_NAV.slice(0, 6).map((item) => ({
  label: item.label,
  href: item.href,
}));

const OPEN_EVENT = "oc:search-open";

/**
 * Botón de la lupa. Puede haber varios (header desktop y header mobile):
 * todos abren el mismo <SearchDialog />, que se monta una sola vez.
 */
export function SearchOverlay() {
  return (
    <button
      type="button"
      className="oc-icon-btn oc-icon-btn-flat"
      aria-label="Buscar"
      title="Buscar"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
    >
      <SearchIcon />
    </button>
  );
}

/** Overlay de búsqueda a pantalla completa. Montar una única vez. */
export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  // El portal sólo existe en el cliente (evita mismatch de hidratación).
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // En móvil el teclado sólo aparece si el foco llega una vez que el
    // overlay ya es visible; por eso el foco va en el siguiente frame.
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);

    // Alto realmente visible: con el teclado abierto el contenido queda
    // centrado en la franja libre y no debajo del teclado.
    const vv = window.visualViewport;
    const syncViewport = () => {
      const h = vv ? vv.height : window.innerHeight;
      document.documentElement.style.setProperty("--oc-search-vh", `${h}px`);
    };
    syncViewport();
    vv?.addEventListener("resize", syncViewport);
    vv?.addEventListener("scroll", syncViewport);

    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      vv?.removeEventListener("resize", syncViewport);
      vv?.removeEventListener("scroll", syncViewport);
      document.documentElement.style.removeProperty("--oc-search-vh");
    };
  }, [open]);

  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const value = inputRef.current?.value.trim() ?? "";
      if (!value) {
        inputRef.current?.focus();
        return;
      }
      inputRef.current?.blur();
      setOpen(false);
      router.push(`/shop?q=${encodeURIComponent(value)}`);
    },
    [router]
  );

  // El overlay va en un portal: dentro del header (sticky con z-index)
  // quedaba atrapado en su contexto de apilamiento y los flotantes
  // (WhatsApp, volver arriba) se dibujaban por encima.
  const overlay = (
    <div
      className={`oc-search-full${open ? " oc-search-full-open" : ""}`}
      role="dialog"
      aria-label="Buscar productos"
      aria-hidden={!open}
      inert={!open}
    >
      <button
        type="button"
        className="oc-search-full-close"
        onClick={() => setOpen(false)}
        aria-label="Cerrar búsqueda"
      >
        <CloseIcon />
      </button>

      <div className="oc-search-full-inner">
        <form className="oc-search-full-form" action="/shop" method="get" onSubmit={onSubmit}>
          <input
            ref={inputRef}
            type="search"
            name="q"
            placeholder="Buscar productos o SKU…"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="search"
            tabIndex={open ? 0 : -1}
          />
        </form>

        <p className="oc-search-full-hint">
          Buscá por nombre o por código de producto (SKU): alcanza con los primeros 5 caracteres.
        </p>

        <div className="oc-search-full-quick">
          {QUICK_LINKS.map((item) => (
            <a key={item.href} href={item.href} className="oc-search-full-chip">
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );

  return mounted ? createPortal(overlay, document.body) : null;
}

function subscribeNoop() {
  return () => {};
}

function SearchIcon() {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
