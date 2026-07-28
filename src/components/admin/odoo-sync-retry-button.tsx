"use client";

import { useState } from "react";

type Props = {
  idVenta: number;
};

export function OdooSyncRetryButton({ idVenta }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function retry() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/odoo/sync-venta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_venta: idVenta }),
      });
      const data = (await res.json()) as { result?: string; error?: string };
      if (!res.ok) {
        setMessage(data.error || "Error al sincronizar");
        return;
      }
      setMessage(`Resultado: ${data.result}`);
      if (data.result === "ok") {
        window.location.reload();
      }
    } catch {
      setMessage("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: "0.5rem" }}>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => void retry()}
        disabled={loading}
      >
        {loading ? "Sincronizando…" : "Reintentar sync Odoo"}
      </button>
      {message && (
        <p className="muted" style={{ marginTop: "0.35rem", marginBottom: 0 }}>
          {message}
        </p>
      )}
    </div>
  );
}
