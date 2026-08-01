"use client";

import { useState } from "react";
import { submitContactForm, type ContactSubmitStatus } from "@/lib/submit-contact-form";

const CANALES = [
  "MercadoLibre",
  "Tienda Online (Website)",
  "Tienda Rosario Centro",
  "Tienda Alto Rosario",
  "Tienda Córdoba Shopping",
  "Tienda Solar Shopping",
  "Tienda Palermo Soho",
  "Tienda Dot Baires Shoppig",
  "Otras Plataformas",
];

export function LibroQuejasForm() {
  const [status, setStatus] = useState<ContactSubmitStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    const fd = new FormData(e.currentTarget);
    const result = await submitContactForm("libro-quejas", fd);
    if (!result.ok) {
      setError(result.error);
      setStatus("error");
      return;
    }
    setStatus("sent");
    e.currentTarget.reset();
  }

  return (
    <form className="oc-inst-form" onSubmit={onSubmit}>
      <div className="oc-inst-form-row">
        <input name="nombre" placeholder="Ingresa Nombre y Apellido" required />
        <input name="telefono" placeholder="Teléfono de Contacto" required />
      </div>

      <div className="oc-inst-form-row">
        <input name="email" type="email" placeholder="Email" required />
        <select name="canal" defaultValue="" required>
          <option value="" disabled>
            Canal de comercialización
          </option>
          {CANALES.map((canal) => (
            <option key={canal} value={canal}>
              {canal}
            </option>
          ))}
        </select>
      </div>

      <textarea name="detalle" placeholder="Detalle del Reclamo / Queja" rows={3} required />

      <button type="submit" className="oc-btn oc-btn-dark" disabled={status === "loading"}>
        {status === "loading" ? "Enviando…" : "Enviar Reclamo"}
      </button>
      {status === "sent" ? (
        <p className="muted">Reclamo enviado. Te contactaremos a la brevedad.</p>
      ) : null}
      {error ? <p className="muted" style={{ color: "#c00" }}>{error}</p> : null}
    </form>
  );
}
