"use client";

import { useState } from "react";
import { importDescuentoGeneralCsv } from "@/app/admin/actions";

export function DescuentoGeneralImportModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="btn btn-secondary"
        style={{ padding: "0.35rem 0.75rem" }}
        onClick={() => setOpen(true)}
      >
        Importar descuento general
      </button>

      {open ? (
        <div
          className="oc-admin-modal-overlay"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            className="oc-admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dg-import-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="oc-admin-modal-head">
              <h2 id="dg-import-title">Importar descuento general</h2>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <form className="oc-admin-modal-form" action={importDescuentoGeneralCsv}>
              <p className="muted" style={{ margin: "0 0 0.75rem", fontSize: "0.85rem" }}>
                CSV con columnas <code>sku</code> y <code>poc_descuento</code> (0–100).
                Valor <strong>0</strong> quita el descuento (queda en{" "}
                <code>null</code>). Separador <code>,</code> o <code>;</code>.
              </p>
              <p style={{ margin: "0 0 0.75rem", fontSize: "0.8rem" }}>
                <a
                  href="/ejemplos/descuento-general.csv"
                  download="descuento-general.csv"
                >
                  Descargar CSV de ejemplo
                </a>
              </p>
              <div className="form-field">
                <label htmlFor="dg-csv">Archivo CSV</label>
                <input
                  id="dg-csv"
                  name="csv"
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  required
                />
              </div>
              <div className="oc-admin-modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Importar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
