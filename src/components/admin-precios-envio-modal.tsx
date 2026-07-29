"use client";

import { useState } from "react";
import { updatePreciosEnvioAction } from "@/app/admin/envios/actions";
import { FASTRACK_ZONAS_PRECIO, SMARTPOST_CORDONES } from "@/lib/parametros";

type Props = {
  smartpostCordones: Record<string, string>;
  fastrackZonas: Record<number, string>;
};

export function PreciosEnvioModal({ smartpostCordones, fastrackZonas }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="btn btn-primary"
        style={{ padding: "0.35rem 0.75rem" }}
        onClick={() => setOpen(true)}
      >
        Actualizar precios
      </button>

      {open && (
        <div
          className="oc-admin-modal-overlay"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            className="oc-admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="precios-envio-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="oc-admin-modal-head">
              <h2 id="precios-envio-title">Precios de envío</h2>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <p className="muted" style={{ marginTop: 0, fontSize: "0.85rem" }}>
              Grupo <code>envios</code>. Al guardar se actualizan los parámetros y los
              precios de todos los códigos postales (FastTrack por zona, SmartPost por
              cordón).
            </p>

            <form action={updatePreciosEnvioAction} className="oc-admin-modal-form">
              <fieldset>
                <legend>SmartPost por cordón</legend>
                <div className="oc-admin-modal-zonas">
                  {SMARTPOST_CORDONES.map((c) => (
                    <label key={c.slug}>
                      {c.label}
                      <input
                        name={`smartpost_${c.slug}`}
                        type="text"
                        inputMode="decimal"
                        required
                        defaultValue={smartpostCordones[c.slug] ?? ""}
                      />
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend>FastTrack por zona</legend>
                <div className="oc-admin-modal-zonas">
                  {FASTRACK_ZONAS_PRECIO.map((zona) => (
                    <label key={zona}>
                      Zona {zona}
                      <input
                        name={`fastrack_zona_${zona}`}
                        type="text"
                        inputMode="decimal"
                        required
                        defaultValue={fastrackZonas[zona] ?? ""}
                      />
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="oc-admin-modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar y actualizar tabla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
