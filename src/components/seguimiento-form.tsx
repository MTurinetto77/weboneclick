"use client";

import { useState, type FormEvent } from "react";
import type {
  SeguimientoResultado,
  TipoEnvioConsulta,
} from "@/lib/seguimiento/types";

type ApiOk = { ok: true; data: SeguimientoResultado };
type ApiErr = { ok: false; message?: string };

export function SeguimientoForm() {
  const [numero, setNumero] = useState("");
  const [tipo, setTipo] = useState<TipoEnvioConsulta>("auto");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<SeguimientoResultado | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResultado(null);

    const numero_pedido = numero.trim();
    if (!numero_pedido) {
      setError("Ingresá tu número de pedido.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/seguimiento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numero_pedido, tipo_envio: tipo }),
      });
      const json = (await res.json()) as ApiOk | ApiErr;
      if (!json.ok) {
        setError(json.message || "No se encontró información para el pedido.");
        return;
      }
      setResultado(json.data);
    } catch {
      setError("Error de conexión. Intentá nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="oc-seguimiento">
      <p className="oc-seguimiento-intro">
        Podés hacer el seguimiento de tu compra ingresando tu número de pedido{" "}
        <strong>OCWN-XXXXX</strong>.
        <br />
        <span className="oc-seguimiento-hint">
          Lo encontrás en el mail de confirmación de compra.
        </span>
      </p>

      <form className="oc-seguimiento-form" onSubmit={onSubmit} noValidate>
        <h2 className="oc-seguimiento-title">Seguimiento de tu pedido</h2>
        <p className="oc-seguimiento-desc">
          Ingresá tu número de pedido para conocer el estado de tu envío
        </p>

        <div className="oc-seguimiento-input-row">
          <input
            id="numero-pedido"
            name="numero_pedido"
            type="text"
            className="oc-seguimiento-input"
            placeholder="Número de pedido"
            value={numero}
            onChange={(e) => {
              setNumero(e.target.value);
              if (error) setError(null);
            }}
            autoComplete="off"
            disabled={loading}
            required
          />
          <button
            type="submit"
            className="oc-seguimiento-btn"
            disabled={loading}
          >
            {loading ? "Consultando…" : "Consultar"}
          </button>
        </div>

        <fieldset className="oc-seguimiento-tipos">
          <legend className="sr-only">Tipo de envío</legend>
          {(
            [
              { value: "auto", label: "Detectar automáticamente" },
              { value: "fasttrack", label: "Envío convencional" },
              { value: "smartpost", label: "Envío en el día" },
            ] as const
          ).map((opt) => (
            <label
              key={opt.value}
              className={`oc-seguimiento-tipo${tipo === opt.value ? " is-selected" : ""}`}
            >
              <input
                type="radio"
                name="tipo_envio"
                value={opt.value}
                checked={tipo === opt.value}
                onChange={() => setTipo(opt.value)}
                disabled={loading}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </fieldset>
      </form>

      {error ? (
        <div className="oc-seguimiento-error" role="alert">
          <strong>Error:</strong> {error}
        </div>
      ) : null}

      {resultado ? <SeguimientoResultadoView data={resultado} /> : null}
    </div>
  );
}

function statusTone(estado: string): "success" | "warning" | "info" {
  const s = estado.toLowerCase();
  if (/entregad|recibid|finaliz|complet/i.test(s)) return "success";
  if (/pendient|demor|incidenc|devol|retenid|anul/i.test(s)) return "warning";
  return "info";
}

function SeguimientoResultadoView({ data }: { data: SeguimientoResultado }) {
  const tone = statusTone(data.estadoActual);

  return (
    <div className="oc-seguimiento-resultado">
      <div className="oc-seguimiento-meta">
        <p>
          <span className="oc-seguimiento-meta-label">Proveedor</span>
          <span>
            {data.proveedor === "fasttrack" ? "FastTrack" : "SmartPost"}
          </span>
        </p>
        <p>
          <span className="oc-seguimiento-meta-label">Tipo</span>
          <span>{data.tipoLabel}</span>
        </p>
        {data.remito ? (
          <p>
            <span className="oc-seguimiento-meta-label">Pedido</span>
            <span>{data.remito}</span>
          </p>
        ) : null}
        {data.nroGuia ? (
          <p>
            <span className="oc-seguimiento-meta-label">Guía</span>
            <span>{data.nroGuia}</span>
          </p>
        ) : null}
        {data.receptor ? (
          <p>
            <span className="oc-seguimiento-meta-label">Receptor</span>
            <span>{data.receptor}</span>
          </p>
        ) : null}
      </div>

      <div className={`oc-seguimiento-estado is-${tone}`}>
        <span className="oc-seguimiento-estado-label">Estado actual</span>
        <strong>{data.estadoActual}</strong>
      </div>

      {data.eventos.length > 0 ? (
        <ol className="oc-seguimiento-timeline">
          {data.eventos.map((ev, i) => (
            <li key={`${ev.fecha}-${ev.estado}-${i}`}>
              <div className="oc-seguimiento-timeline-dot" aria-hidden />
              <div className="oc-seguimiento-timeline-body">
                <time>{ev.fecha}</time>
                <strong>{ev.estado}</strong>
                {ev.detalle ? <p>{ev.detalle}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="oc-seguimiento-empty-timeline">
          No hay historial de movimientos disponible todavía.
        </p>
      )}
    </div>
  );
}
