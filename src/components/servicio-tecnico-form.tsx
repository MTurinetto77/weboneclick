"use client";

import { useState } from "react";
import Link from "next/link";

const TIENDAS = [
  "Rosario Centro",
  "Alto Rosario",
  "Córdoba Shopping",
  "Solar Shopping",
  "Palermo Soho",
  "Dot Baires Shopping",
];

const DEVICES = [
  "iPhone",
  "iPad",
  "Mac",
  "Macbook",
  "AirPods",
  "Apple Watch",
  "Apple TV",
  "Otro dispositivo",
];

export function ServicioTecnicoForm() {
  const [status, setStatus] = useState<"idle" | "sent">("idle");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) || "").trim();
    const dispositivos = fd.getAll("dispositivo").map(String);

    const body = [
      `Nombre: ${get("nombre")}`,
      `Teléfono: ${get("telefono")}`,
      `Email: ${get("email")}`,
      `Tipo de entrega: ${get("entrega")}`,
      `Tienda: ${get("tienda")}`,
      `Dispositivo(s): ${dispositivos.join(", ")}`,
      `Modelo: ${get("modelo")}`,
      `Nº de serie: ${get("serie")}`,
      "",
      "Detalle de la falla:",
      get("falla"),
    ].join("\n");

    window.location.href = `mailto:info@oneclickstore.com?subject=${encodeURIComponent(
      "Solicitud Servicio Técnico OneClick"
    )}&body=${encodeURIComponent(body)}`;
    setStatus("sent");
  }

  return (
    <div className="oc-st-request">
      <div className="oc-st-request-form">
        <h2>Solicitar Servicio Técnico</h2>
        <form className="oc-st-form" onSubmit={onSubmit}>
          <label className="oc-st-field">
            <span>Nombre Completo *</span>
            <input name="nombre" required autoComplete="name" />
          </label>
          <label className="oc-st-field">
            <span>Teléfono *</span>
            <input name="telefono" required autoComplete="tel" />
          </label>
          <label className="oc-st-field">
            <span>Email *</span>
            <input name="email" type="email" required autoComplete="email" />
          </label>

          <fieldset className="oc-st-fieldset">
            <legend>Tipo de entrega *</legend>
            <label>
              <input type="radio" name="entrega" value="Presencial en Tiendas" required />{" "}
              Presencial en Tiendas
            </label>
            <label>
              <input type="radio" name="entrega" value="Envío desde el Interior" /> Envío desde el
              Interior
            </label>
          </fieldset>

          <fieldset className="oc-st-fieldset">
            <legend>Tienda en la que desea gestionar el Servicio Técnico *</legend>
            {TIENDAS.map((t) => (
              <label key={t}>
                <input type="radio" name="tienda" value={t} required /> {t}
              </label>
            ))}
          </fieldset>

          <fieldset className="oc-st-fieldset">
            <legend>Tipo de dispositivo</legend>
            {DEVICES.map((d) => (
              <label key={d}>
                <input type="checkbox" name="dispositivo" value={d} /> {d}
              </label>
            ))}
          </fieldset>

          <div className="oc-st-form-row">
            <label className="oc-st-field">
              <span>Modelo del equipo *</span>
              <input name="modelo" required />
            </label>
            <label className="oc-st-field">
              <span>Número de serie</span>
              <input name="serie" />
            </label>
          </div>

          <label className="oc-st-field">
            <span>Detalle de la falla *</span>
            <textarea name="falla" rows={4} required />
          </label>

          <button type="submit" className="oc-btn oc-btn-dark oc-st-submit">
            SOLICITAR SERVICIO TÉCNICO →
          </button>
          {status === "sent" ? (
            <p className="oc-st-form-ok">
              Se abrió tu cliente de correo para enviar la solicitud.
            </p>
          ) : null}
        </form>
      </div>

      <aside className="oc-st-request-aside">
        <h2>Contactanos</h2>
        <a className="oc-st-aside-item" href="tel:08003451663">
          <PhoneIcon />
          <span>0800 345 1663</span>
        </a>
        <Link className="oc-st-aside-item" href="/tiendas">
          <PinIcon />
          <span>Visitá nuestras tiendas</span>
        </Link>
      </aside>
    </div>
  );
}

function PhoneIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8.5 3.5h3.2l1.1 3.3-1.6 1.1a12.5 12.5 0 005.4 5.4l1.1-1.6 3.3 1.1v3.2c0 .9-.7 1.6-1.6 1.6C10.8 18.6 5.4 13.2 5.4 6.1c0-.9.7-1.6 1.6-1.6z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s7-5.2 7-11a7 7 0 10-14 0c0 5.8 7 11 7 11z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
