"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MAIN_NAV } from "@/lib/nav";

const QUICK_LINKS = MAIN_NAV.slice(0, 6).map((item) => ({
  label: item.label,
  href: item.href,
}));

export function SearchOverlay() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="oc-icon-btn oc-icon-btn-flat"
        aria-label="Buscar"
        title="Buscar"
        onClick={() => setOpen(true)}
      >
        <SearchIcon />
      </button>

      <div
        className={`oc-search-full${open ? " oc-search-full-open" : ""}`}
        role="dialog"
        aria-label="Buscar productos"
        aria-hidden={!open}
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
          <form className="oc-search-full-form" action="/shop" method="get">
            <input
              ref={inputRef}
              type="search"
              name="q"
              placeholder="Buscar productos…"
              autoComplete="off"
              tabIndex={open ? 0 : -1}
            />
          </form>

          <div className="oc-search-full-quick">
            {QUICK_LINKS.map((item) => (
              <a key={item.href} href={item.href} className="oc-search-full-chip">
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
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
