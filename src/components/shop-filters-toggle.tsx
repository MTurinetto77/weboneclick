"use client";

import { useId, useState, type ReactNode } from "react";

type Props = {
  /** Cantidad de filtros aplicados, para mostrar junto al botón cuando está plegado */
  activos: number;
  children: ReactNode;
};

/**
 * En mobile el panel de filtros arranca plegado detrás de un botón "Filtros".
 * En desktop (>960px) el CSS oculta el botón y muestra siempre el contenido,
 * así que este estado no tiene efecto ahí.
 */
export function ShopFiltersToggle({ activos, children }: Props) {
  const [abierto, setAbierto] = useState(false);
  const panelId = useId();

  return (
    <>
      <button
        type="button"
        className="oc-shop-filters-btn"
        aria-expanded={abierto}
        aria-controls={panelId}
        onClick={() => setAbierto((v) => !v)}
      >
        <span>Filtros</span>
        {activos > 0 && <span className="oc-shop-filters-count">{activos}</span>}
      </button>
      <div
        id={panelId}
        className={`oc-shop-filters-panel${abierto ? " is-open" : ""}`}
      >
        {children}
      </div>
    </>
  );
}
