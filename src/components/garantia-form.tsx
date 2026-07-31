"use client";

import { useState } from "react";
import { submitContactForm, type ContactSubmitStatus } from "@/lib/submit-contact-form";

const TIENDAS = [
  "Rosario Centro",
  "Alto Rosario",
  "Córdoba Shopping",
  "Solar Shopping",
  "Palermo Soho",
  "Dot Baires Shopping",
  "Envío desde el interior del país",
];

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

export function GarantiaForm() {
  const [status, setStatus] = useState<ContactSubmitStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    const fd = new FormData(e.currentTarget);
    const result = await submitContactForm("garantia", fd);
    if (!result.ok) {
      setError(result.error);
      setStatus("error");
      return;
    }
    setStatus("sent");
    e.currentTarget.reset();
  }

  return (
    <form className="oc-inst-form" onSubmit={onSubmit} encType="multipart/form-data">
      <div className="oc-inst-form-row">
        <input name="nombre" placeholder="Ingresa Nombre y Apellido" required />
        <input name="telefono" placeholder="Teléfono de Contacto" required />
      </div>

      <input name="email" type="email" placeholder="Email" required />

      <fieldset>
        <legend>Tienda en la que desea gestionar la garantía</legend>
        {TIENDAS.map((tienda) => (
          <label key={tienda}>
            <input type="radio" name="tienda" value={tienda} required />
            {tienda}
          </label>
        ))}
      </fieldset>

      <div className="oc-inst-form-row oc-inst-form-row-3">
        <input name="nrofactura" placeholder="A/B-xxxx-xxxxxxxx" required />
        <label className="oc-field-label">
          Fecha del Comprobante
          <input name="fechacomp" type="date" required />
        </label>
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

      <textarea name="detalle" placeholder="Detalle de la falla" rows={3} required />

      <label className="oc-field-label">
        Adjuntar Imagen/Foto del estado actual del producto
        <input name="fotos" type="file" accept="image/*" multiple required />
      </label>

      <button type="submit" className="oc-btn oc-btn-dark" disabled={status === "loading"}>
        {status === "loading" ? "Enviando…" : "Solicitar Garantía"}
      </button>
      {status === "sent" ? (
        <p className="muted">Solicitud enviada. Te contactaremos a la brevedad.</p>
      ) : null}
      {error ? <p className="muted" style={{ color: "#c00" }}>{error}</p> : null}
    </form>
  );
}
