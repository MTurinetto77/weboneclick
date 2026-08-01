import { CambioFacturacionForm } from "@/components/cambio-facturacion-form";

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

            <span
              className="oc-fact-tag oc-fact-tag-nro"
              title="Número de Factura Completo (Formato: B/A-XXXX-XXXXXXXX)"
            >
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
          <CambioFacturacionForm />
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
