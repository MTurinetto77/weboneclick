"use client";

import { useState } from "react";
import { updatePreciosEnvioAction } from "@/app/admin/envios/actions";
import { FASTRACK_ZONAS_PRECIO } from "@/lib/parametros";

type Props = {
  smartpostPrecio: string;
  preciosZona: Record<number, string>;
};

export function PreciosEnvioModal({ smartpostPrecio, preciosZona }: Props) {
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
              precios de todos los códigos postales (FastTrack por zona, SmartPost
              uniforme).
            </p>

            <form action={updatePreciosEnvioAction} className="oc-admin-modal-form">
              <fieldset>
                <legend>SmartPost</legend>
                <label>
                  Precio SmartPost
                  <input
                    name="smartpost_precio"
                    type="text"
                    inputMode="decimal"
                    required
                    defaultValue={smartpostPrecio}
                  />
                </label>
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
                        defaultValue={preciosZona[zona] ?? ""}
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
