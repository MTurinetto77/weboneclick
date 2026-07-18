export const metadata = { title: "Cambio de facturación" };

export default function CambioFacturacionPage() {
  return (
    <div className="container oc-inst-page oc-facturacion">
      <div className="oc-facturacion-grid">
        <div className="oc-facturacion-guide">
          <h1>¿Dónde encuentro la información en mi factura actual?</h1>

          <figure className="oc-facturacion-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/oneclick/pages/invoice.jpg"
              alt="Previsualización de factura OneClick con campos señalados"
            />

            <span className="oc-fact-tag oc-fact-tag-nro" title="Número de Factura Completo (Formato: B/A-XXXX-XXXXXXXX)">
              <ArrowDownIcon />
              Número de Factura
            </span>

            <span className="oc-fact-tag oc-fact-tag-fecha" title="Fecha del Comprobante">
              <ArrowUpIcon />
              Fecha del Comprobante
            </span>

            <span className="oc-fact-tag oc-fact-tag-importe" title="Importe Final">
              <ArrowDownIcon />
              Importe Final
            </span>
          </figure>
        </div>

        <div>
          <h2>Cambios de Facturación</h2>
          <form
            className="oc-inst-form"
            action="mailto:info@oneclickstore.com"
            method="get"
            encType="text/plain"
          >
            <input type="hidden" name="subject" value="Solicitud Cambio de Facturación" />
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
            <button type="submit" className="oc-btn oc-btn-dark">
              SOLICITAR CAMBIO DE FACTURACIÓN
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ArrowDownIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 7v8M8.5 12.5L12 16l3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 17V9M8.5 11.5L12 8l3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
