"use client";

import { useState } from "react";
import { submitContactForm, type ContactSubmitStatus } from "@/lib/submit-contact-form";

export function CambioFacturacionForm() {
  const [status, setStatus] = useState<ContactSubmitStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    const fd = new FormData(e.currentTarget);
    const result = await submitContactForm("cambio-facturacion", fd);
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
      <input name="nombre" placeholder="Ingresa Nombre y Apellido" required />
      <input name="telefono" placeholder="Teléfono de Contacto" required />
      <input name="email" type="email" placeholder="Email" required />

      <fieldset>
        <legend>Tipo de Cambio</legend>
        <label>
          <input type="radio" name="tipo" value="Factura B → Factura A" required /> Factura B →
          Factura A
        </label>
        <label>
          <input type="radio" name="tipo" value="Factura A → Factura B" /> Factura A → Factura B
        </label>
      </fieldset>

      <input name="nro_b" placeholder="B-xxxx-xxxxxxxx" />
      <input name="nro_a" placeholder="A-xxxx-xxxxxxxx" />
      <label className="oc-field-label">
        Fecha del Comprobante
        <input name="fecha" type="date" required />
      </label>
      <input name="importe" placeholder="Importe del comprobante" required />
      <input name="cuit" placeholder="CUIT" />
      <input name="dni" placeholder="DNI" />
      <textarea name="observaciones" placeholder="Observaciones" rows={3} />
      <button type="submit" className="oc-btn oc-btn-dark" disabled={status === "loading"}>
        {status === "loading" ? "ENVIANDO…" : "SOLICITAR CAMBIO DE FACTURACIÓN"}
      </button>
      {status === "sent" ? (
        <p className="muted">Solicitud enviada. Te contactaremos a la brevedad.</p>
      ) : null}
      {error ? <p className="muted" style={{ color: "#c00" }}>{error}</p> : null}
    </form>
  );
}
