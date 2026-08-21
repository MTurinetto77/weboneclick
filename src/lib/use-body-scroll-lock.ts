"use client";

import { useEffect } from "react";

/**
 * Bloqueo de scroll del body compartido por todos los overlays (drawer del
 * carrito, buscador, menú mobile, modales del PDP...).
 *
 * Cada overlay guardaba y restauraba `body.style.overflow` por su cuenta, y
 * cuando dos se superponían el de adentro capturaba `prev = "hidden"` y al
 * cerrarse lo volvía a aplicar: la página quedaba sin scroll para siempre.
 * Acá el estado original se guarda una sola vez (al tomar el primer lock) y
 * se restaura recién cuando se libera el último.
 */
let locks = 0;
let restore: (() => void) | null = null;

export function lockBodyScroll(): () => void {
  if (typeof document === "undefined") return () => {};

  if (locks === 0) {
    const { body } = document;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;
    // Compensar el ancho de la barra de scroll para que la página no salte.
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbar > 0) {
      const actual = parseFloat(getComputedStyle(body).paddingRight) || 0;
      body.style.paddingRight = `${actual + scrollbar}px`;
    }
    restore = () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
    };
  }
  locks += 1;

  let liberado = false;
  return () => {
    if (liberado) return;
    liberado = true;
    locks = Math.max(0, locks - 1);
    if (locks === 0) {
      restore?.();
      restore = null;
    }
  };
}

/** Bloquea el scroll del body mientras `active` sea true. */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    return lockBodyScroll();
  }, [active]);
}
