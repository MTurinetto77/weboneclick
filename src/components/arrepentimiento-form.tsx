"use client";

import { useState } from "react";
import { submitContactForm, type ContactSubmitStatus } from "@/lib/submit-contact-form";

export function ArrepentimientoForm() {
  const [status, setStatus] = useState<ContactSubmitStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    const fd = new FormData(e.currentTarget);
    const result = await submitContactForm("arrepentimiento", fd);
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
        <legend>Motivo de Cambio</legend>
        <label>
          <input type="radio" name="tipocambio" value="Arrepentimiento de Compra" required />
          Arrepentimiento de Compra
        </label>
        <label>
          <input type="radio" name="tipocambio" value="Producto Dañado" required />
          Producto Dañado
        </label>
        <label>
          <input type="radio" name="tipocambio" value="Mal Funcionamiento" required />
          Mal Funcionamiento
        </label>
        <label>
          <input type="radio" name="tipocambio" value="Error en el Pedido" required />
          Error en el Pedido
        </label>
      </fieldset>

      <input name="nrofactura" placeholder="A/B-xxxx-xxxxxxxx" required />
      <label className="oc-field-label">
        Fecha del Comprobante
        <input name="fechacomp" type="date" required />
      </label>
      <input name="importefinal" placeholder="Importe del comprobante" required />
      <textarea name="detalles" placeholder="Detalles de la Devolución" rows={3} />

      <button type="submit" className="oc-btn oc-btn-dark" disabled={status === "loading"}>
        {status === "loading" ? "Enviando…" : "Solicitar Devolución"}
      </button>
      {status === "sent" ? (
        <p className="muted">Solicitud enviada. Te contactaremos a la brevedad.</p>
      ) : null}
      {error ? <p className="muted" style={{ color: "#c00" }}>{error}</p> : null}
    </form>
  );
}
