import { ServicioTecnicoForm } from "@/components/servicio-tecnico-form";

export const metadata = { title: "Reemplazo de pantalla o batería" };

const FEATURES = [
  "Reparación express en 2 horas",
  "Piezas originales Apple",
  "Técnicos certificados por Apple",
] as const;

export default function ReemplazoPantallaBateriaPage() {
  return (
    <div className="oc-st">
      <section className="container oc-st-hero">
        <h1>Cambiá la pantalla o batería de tu iPhone en solo 2 horas</h1>
        <p>
          En OneClick, Apple Authorized Service Provider en Argentina, reparamos tu iPhone con
          técnicos certificados y repuestos originales Apple. Ya sea que necesites cambiar la
          pantalla o la batería, te ofrecemos un servicio rápido, seguro y con garantía oficial.
        </p>
        <a href="#requestst" className="oc-btn oc-btn-dark">
          Contactar Servicio Técnico OneClick
        </a>
      </section>

      <section className="container oc-st-value">
        <p className="oc-st-value-lead">
          Si traés tu iPhone antes de las 16:00hs de lunes a viernes, y contamos con el repuesto en
          stock, se realizará el cambio de pantalla o batería el mismo día. Si lo acercás después de
          las 16:00hs, la reparación se completará el siguiente día hábil.
        </p>
        <div className="oc-st-features-grid oc-st-features-grid-3">
          {FEATURES.map((title) => (
            <article key={title}>
              <p>{title}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container oc-st-form-section" id="requestst">
        <ServicioTecnicoForm />
      </section>
    </div>
  );
}
