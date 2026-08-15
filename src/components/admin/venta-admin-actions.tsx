"use client";

import { useState } from "react";

type Props = {
  idVenta: number;
  estado: string;
};

type SyncMpResponse = {
  result?: string;
  message?: string;
  paymentsFound?: number;
  error?: string;
  applied?: Array<{ id: string; status: string; result: string }>;
};

export function VentaAdminActions({ idVenta, estado }: Props) {
  const [loadingMp, setLoadingMp] = useState(false);
  const [loadingCancel, setLoadingCancel] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canSyncMp = estado === "pendiente";
  const canCancel = estado === "pendiente";

  async function syncMp() {
    setLoadingMp(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/ventas/sync-mp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_venta: idVenta }),
      });
      const data = (await res.json()) as SyncMpResponse;
      if (!res.ok) {
        setMessage(data.error || "Error al controlar el pago");
        return;
      }
      const detail =
        data.paymentsFound != null
          ? ` · ${data.paymentsFound} pago(s) en MP`
          : "";
      setMessage(`${data.message || data.result || "Listo"}${detail}`);
      if (data.result === "approved") {
        window.location.reload();
      }
    } catch {
      setMessage("No se pudo conectar con el servidor");
    } finally {
      setLoadingMp(false);
    }
  }

  async function cancelar() {
    if (
      !window.confirm(
        `¿Cancelar la venta #${idVenta}? Se liberará el cupón si había uno.`,
      )
    ) {
      return;
    }
    setLoadingCancel(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/ventas/cancelar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_venta: idVenta }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        setMessage(data.error || "Error al cancelar");
        return;
      }
      setMessage(data.message || "Venta cancelada");
      window.location.reload();
    } catch {
      setMessage("No se pudo conectar con el servidor");
    } finally {
      setLoadingCancel(false);
    }
  }

  if (!canSyncMp && !canCancel) return null;

  return (
    <div style={{ marginTop: "0.75rem" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {canSyncMp ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void syncMp()}
            disabled={loadingMp || loadingCancel}
          >
            {loadingMp ? "Consultando MP…" : "Controlar pago en Mercado Pago"}
          </button>
        ) : null}
        {canCancel ? (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => void cancelar()}
            disabled={loadingMp || loadingCancel}
          >
            {loadingCancel ? "Cancelando…" : "Pasar a cancelada"}
          </button>
        ) : null}
      </div>
      {message ? (
        <p className="muted" style={{ marginTop: "0.35rem", marginBottom: 0 }}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
