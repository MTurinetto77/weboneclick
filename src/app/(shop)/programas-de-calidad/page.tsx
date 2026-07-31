import { ServicioTecnicoForm } from "@/components/servicio-tecnico-form";

export const metadata = { title: "Programas de calidad" };

const STEPS = [
  {
    title: "Verificá",
    body: "en la web oficial de Apple si tu dispositivo está incluido en un programa vigente.",
  },
  {
    title: "Si aplica",
    body: "en OneClick, como Apple Authorized Service Provider, realizamos la reparación o el reemplazo sin costo según los términos de Apple.",
  },
] as const;

const BENEFITS = [
  "Reparación o reemplazo gratuito oficial",
  "Piezas originales Apple",
  "Técnicos certificados por Apple",
] as const;

const PROGRAMS = [
  {
    title: "Programa de servicio de la Mac mini para problemas de alimentación",
    href: "https://support.apple.com/es-lamr/mac-mini-2023-service-program-for-no-power-issue",
  },
  {
    title: "Programa de servicio de iPhone 14 Plus para problemas con la cámara posterior",
    href: "https://support.apple.com/es-lamr/iphone-14-plus-service-program-for-rear-camera-issue",
  },
  {
    title: "Programa de retirada del mercado de baterías para MacBook Pro de 15 pulgadas",
    href: "https://support.apple.com/es-lamr/15-inch-macbook-pro-battery-recall",
  },
] as const;

export default function ProgramasDeCalidadPage() {
  return (
    <div className="oc-st">
      <section className="container oc-st-hero">
        <h1>Programa de Calidad Apple en Argentina</h1>
        <p>
          Apple identifica, en algunos casos, defectos de fabricación en determinados modelos y
          ofrece reparaciones o reemplazos gratuitos a través de su Programa de Calidad.
        </p>
        <a href="#requestst" className="oc-btn oc-btn-dark">
          Contactar Servicio Técnico OneClick
        </a>
      </section>

      <section className="container oc-st-value">
        <h2>¿Cómo saber si tu equipo aplica?</h2>
        <div className="oc-st-features-grid oc-st-features-grid-2">
          {STEPS.map((s) => (
            <article key={s.title}>
              <p>
                <strong>{s.title}</strong> {s.body}
              </p>
            </article>
          ))}
        </div>
        <div className="oc-st-features-grid oc-st-features-grid-3" style={{ marginTop: "1.75rem" }}>
          {BENEFITS.map((title) => (
            <article key={title}>
              <p>{title}</p>
            </article>
          ))}
        </div>
        <div className="oc-st-services-cta">
          <a href="#requestst" className="oc-btn oc-btn-dark">
            Contactar Servicio Técnico OneClick
          </a>
        </div>
      </section>

      <section className="container oc-st-services">
        <h2 className="oc-st-subpage-title">Conocé los programas de calidad</h2>
        <div className="oc-st-accordion">
          {PROGRAMS.map((p) => (
            <details key={p.href} className="oc-st-acc-item">
              <summary>{p.title}</summary>
              <div className="oc-st-acc-body">
                <p>
                  <a href={p.href} target="_blank" rel="noreferrer">
                    Ver programa &gt;
                  </a>
                </p>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="container oc-st-form-section" id="requestst">
        <ServicioTecnicoForm />
      </section>
    </div>
  );
}
