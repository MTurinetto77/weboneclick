"use client";

import { useEffect, type ReactNode } from "react";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/** Modal liviano del PDP (condiciones de pago, disponibilidad en sucursales). */
export function PdpInfoModal({ open, title, onClose, children }: Props) {
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="oc-pdp-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="oc-pdp-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="oc-pdp-modal-head">
          <h3>{title}</h3>
          <button
            type="button"
            className="oc-pdp-modal-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="oc-pdp-modal-body">{children}</div>
      </div>
    </div>
  );
}
