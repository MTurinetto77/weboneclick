"use client";

import { useState } from "react";
import { submitContactForm, type ContactSubmitStatus } from "@/lib/submit-contact-form";

export function EmpresasContactForm() {
  const [status, setStatus] = useState<ContactSubmitStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    const fd = new FormData(e.currentTarget);
    const result = await submitContactForm("empresas", fd);
    if (!result.ok) {
      setError(result.error);
      setStatus("error");
      return;
    }
    setStatus("sent");
    e.currentTarget.reset();
  }

  return (
    <form className="oc-empresas-form" onSubmit={onSubmit}>
      <input name="nombre" placeholder="Nombre y Apellido" required autoComplete="name" />
      <input name="empresa" placeholder="Empresa" required autoComplete="organization" />
      <input name="email" type="email" placeholder="Email" required autoComplete="email" />
      <input name="telefono" type="tel" placeholder="Teléfono" required autoComplete="tel" />
      <textarea name="mensaje" placeholder="Mensaje" rows={5} required />
      <button type="submit" className="oc-empresas-submit" disabled={status === "loading"}>
        {status === "loading" ? "ENVIANDO…" : "ENVIAR DATOS"}
      </button>
      {status === "sent" ? (
        <p className="oc-empresas-form-ok">
          Consulta enviada. Un asesor te contactará a la brevedad.
        </p>
      ) : null}
      {error ? <p className="oc-empresas-form-ok" style={{ color: "#c00" }}>{error}</p> : null}
    </form>
  );
}
