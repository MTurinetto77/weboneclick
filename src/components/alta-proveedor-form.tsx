"use client";

import { useState } from "react";
import { submitContactForm, type ContactSubmitStatus } from "@/lib/submit-contact-form";

const PROVINCIAS = [
  "Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Ciudad Autónoma de Buenos Aires",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego, Antártida e Islas del Atlántico Sur",
  "Tucumán",
];

const IVA = [
  "IVA Responsable Inscripto",
  "IVA Resp Inscripto - Factura M",
  "IVA Responsable no Inscripto",
  "IVA no Responsable",
  "IVA Exento",
  "Consumidor Final",
  "Sujeto no Categorizado",
  "Responsable Monotributo",
];

export function AltaProveedorForm() {
  const [status, setStatus] = useState<ContactSubmitStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    const fd = new FormData(e.currentTarget);
    const result = await submitContactForm("alta-proveedor", fd);
    if (!result.ok) {
      setError(result.error);
      setStatus("error");
      return;
    }
    setStatus("sent");
    e.currentTarget.reset();
  }

  return (
    <form className="oc-inst-form oc-fiscal-form" onSubmit={onSubmit}>
      <h3>Datos Generales</h3>
      <input name="razon_social" placeholder="Nombre o Razón Social" required />
      <input name="calle" placeholder="Dirección (Calle)" required />
      <input name="altura" placeholder="Dirección (Número / Altura)" required />
      <select name="provincia" required defaultValue="">
        <option value="" disabled>
          Localidad / Provincia
        </option>
        {PROVINCIAS.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <input name="cp" placeholder="Código Postal" required />
      <input name="pais" placeholder="País" defaultValue="Argentina" required />
      <input name="telefono" placeholder="Teléfono" required />
      <input
        name="email_pago"
        type="email"
        placeholder="Dirección de E-Mail para informar pago"
        required
      />
      <fieldset>
        <legend>Método de pago</legend>
        <label>
          <input type="radio" name="metodo_pago" value="TRANSFERENCIA" required />
          <span>TRANSFERENCIA</span>
        </label>
        <label>
          <input type="radio" name="metodo_pago" value="E.CHEQ" />
          <span>E.CHEQ</span>
        </label>
      </fieldset>

      <h3>Información Impositiva</h3>
      <input name="cuit" placeholder="CUIT" required />
      <select name="iva" required defaultValue="">
        <option value="" disabled>
          Impuesto al Valor Agregado
        </option>
        {IVA.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
      <fieldset>
        <legend>Impuesto a las Ganancias</legend>
        <label>
          <input type="radio" name="ganancias" value="Inscripto" required />
          <span>Inscripto</span>
        </label>
        <label>
          <input type="radio" name="ganancias" value="No inscripto" />
          <span>No inscripto</span>
        </label>
      </fieldset>
      <fieldset>
        <legend>Impuesto a los Ingresos Brutos</legend>
        <label>
          <input type="radio" name="iibb" value="Convenio Multilateral" required />
          <span>Convenio Multilateral</span>
        </label>
        <label>
          <input type="radio" name="iibb" value="Convenio Local" />
          <span>Convenio Local</span>
        </label>
      </fieldset>
      <input name="nro_inscripcion" placeholder="NRO DE INSCRIPCION" />
      <p className="muted">
        Se deberá adjuntar constancia de inscripción y comprobante CM05 actualizado. Sin excepción.
      </p>
      <fieldset>
        <legend>Certificación de exclusión</legend>
        <label>
          <input type="radio" name="exclusion" value="Si" required />
          <span>Sí</span>
        </label>
        <label>
          <input type="radio" name="exclusion" value="No" />
          <span>No</span>
        </label>
      </fieldset>

      <h3>Datos Bancarios</h3>
      <input name="banco" placeholder="Ingresa el Nombre de la Entidad Bancaria" required />
      <input name="titular" placeholder="Titular de la cuenta" required />
      <p className="muted">
        El titular de la cuenta deberá ser el mismo que la razón social de la empresa. Sin
        exclusión.
      </p>
      <input name="cbu" placeholder="CBU" required />
      <input name="nro_cuenta" placeholder="Nro de Cuenta" required />

      <button type="submit" className="oc-btn oc-btn-dark" disabled={status === "loading"}>
        {status === "loading" ? "Enviando…" : "Solicitar Alta de Proveedor"}
      </button>
      {status === "sent" ? (
        <p className="muted">Solicitud enviada. Te contactaremos a la brevedad.</p>
      ) : null}
      {error ? <p className="muted" style={{ color: "#c00" }}>{error}</p> : null}
    </form>
  );
}
