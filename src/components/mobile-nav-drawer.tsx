"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { NavItem } from "@/lib/nav";

export function MobileNavDrawer({ nav }: { nav: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
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
        className="oc-icon-btn oc-icon-btn-flat oc-header-mobile-menu-btn"
        aria-label="Abrir menú"
        onClick={() => setOpen(true)}
      >
        <MenuIcon />
      </button>

      <div
        className={`oc-mobile-nav-overlay${open ? " oc-mobile-nav-overlay-open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden
      />

      <aside
        className={`oc-mobile-nav-drawer${open ? " oc-mobile-nav-drawer-open" : ""}`}
        role="dialog"
        aria-label="Menú"
        aria-hidden={!open}
      >
        <header className="oc-mobile-nav-head">
          <span>Menú</span>
          <button
            type="button"
            className="oc-mobile-nav-close"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
          >
            <CloseIcon />
          </button>
        </header>

        <nav className="oc-mobile-nav-list">
          {nav.map((item) => {
            const hasChildren = !!item.children && item.children.length > 0;
            const isExpanded = expanded === item.href;
            return (
              <div key={item.href} className="oc-mobile-nav-item">
                <div className="oc-mobile-nav-row">
                  <Link href={item.href} onClick={() => setOpen(false)}>
                    {item.label}
                  </Link>
                  {hasChildren && (
                    <button
                      type="button"
                      className={`oc-mobile-nav-caret${isExpanded ? " is-open" : ""}`}
                      aria-label={`Ver ${item.label}`}
                      onClick={() => setExpanded(isExpanded ? null : item.href)}
                    >
                      <CaretIcon />
                    </button>
                  )}
                </div>
                {hasChildren && isExpanded && (
                  <div className="oc-mobile-nav-children">
                    {item.children!.map((c) => (
                      <Link key={c.href + c.label} href={c.href} onClick={() => setOpen(false)}>
                        {c.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="oc-mobile-nav-foot">
          <Link href="/mi-cuenta" onClick={() => setOpen(false)}>
            Mi cuenta
          </Link>
          <Link href="/lista-deseos" onClick={() => setOpen(false)}>
            Lista de deseos
          </Link>
        </div>
      </aside>
    </>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CaretIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
