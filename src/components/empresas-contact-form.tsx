"use client";

import { useState } from "react";

export function EmpresasContactForm() {
  const [status, setStatus] = useState<"idle" | "sent">("idle");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nombre = String(fd.get("nombre") || "").trim();
    const empresa = String(fd.get("empresa") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const telefono = String(fd.get("telefono") || "").trim();
    const mensaje = String(fd.get("mensaje") || "").trim();

    const body = [
      `Nombre y Apellido: ${nombre}`,
      `Empresa: ${empresa}`,
      `Email: ${email}`,
      `Teléfono: ${telefono}`,
      "",
      "Mensaje:",
      mensaje,
    ].join("\n");

    const mailto = `mailto:corporativo@oneclickstore.com?subject=${encodeURIComponent(
      "Consulta Empresas OneClick"
    )}&body=${encodeURIComponent(body)}`;

    window.location.href = mailto;
    setStatus("sent");
  }

  return (
    <form className="oc-empresas-form" onSubmit={onSubmit}>
      <input name="nombre" placeholder="Nombre y Apellido" required autoComplete="name" />
      <input name="empresa" placeholder="Empresa" required autoComplete="organization" />
      <input name="email" type="email" placeholder="Email" required autoComplete="email" />
      <input name="telefono" type="tel" placeholder="Teléfono" required autoComplete="tel" />
      <textarea name="mensaje" placeholder="Mensaje" rows={5} required />
      <button type="submit" className="oc-empresas-submit">
        ENVIAR DATOS
      </button>
      {status === "sent" ? (
        <p className="oc-empresas-form-ok">
          Se abrió tu cliente de correo para enviar la consulta. Un asesor te contactará a la
          brevedad.
        </p>
      ) : null}
    </form>
  );
}
