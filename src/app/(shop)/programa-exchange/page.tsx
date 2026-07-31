import { ServicioTecnicoForm } from "@/components/servicio-tecnico-form";

export const metadata = { title: "Programa Exchange" };

const HOW = [
  {
    title: "Te entregamos un dispositivo nuevo (sin caja ni accesorios)",
    icon: "phone" as const,
    tip: "Política aduanera en Argentina: Por normativa, los equipos Exchange se entregan sin caja, ya que la unidad reemplazada debe enviarse a Apple en la misma caja con la que ingresó al país.",
  },
  {
    title: "No es necesario que el equipo esté en garantía o en funcionamiento",
    icon: "thumb" as const,
    tip: null,
  },
  {
    title: "Solo debe contar con todas sus partes originales",
    icon: "badge" as const,
    tip: null,
  },
] as const;

const NOTES = [
  "Este programa aplica para: iPhone, iPad, Apple Watch, iPod, Apple TV, Beats, AirPods y accesorios Apple.",
  "En el caso de iPads, iPods, AirPods, Apple Watch y Beats, los equipos son unidades selladas y no admiten reparación.",
  "Los dispositivos entregados bajo Exchange son nuevos, no reciclados, y cuentan con 90 días de garantía oficial Apple.",
] as const;

export default function ProgramaExchangePage() {
  return (
    <div className="oc-exchange">
      <section className="container oc-exchange-hero">
        <h1>Programa Exchange Apple en Argentina</h1>
        <p className="oc-exchange-disclaimer">
          El Programa Exchange no permite cambios por equipos de diferente modelo o capacidad.
        </p>
        <p>
          Si tu dispositivo Apple tiene daños que no pueden repararse, en OneClick te ofrecemos el
          Programa Exchange, con el cual podés reemplazarlo por un equipo nuevo con las mismas
          características (modelo, capacidad y color).
        </p>
      </section>

      <section className="oc-exchange-how">
        <div className="container">
          <h2>¿Cómo funciona?</h2>
          <div className="oc-exchange-cards">
            {HOW.map((item) => (
              <article key={item.title} className="oc-exchange-card">
                <span className="oc-exchange-card-icon" aria-hidden>
                  <HowIcon name={item.icon} />
                </span>
                <p>{item.title}</p>
                {item.tip ? (
                  <span className="oc-exchange-tip" role="tooltip">
                    {item.tip}
                  </span>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="container oc-exchange-cta">
        <a href="#requestst" className="oc-exchange-btn">
          Contactar Servicio Técnico OneClick
        </a>
      </section>

      <section className="container oc-exchange-info">
        <div className="oc-exchange-info-icon" aria-hidden>
          <WarningIcon />
        </div>
        <h2>Información Importante</h2>
        <ol className="oc-exchange-notes">
          {NOTES.map((s, i) => (
            <li key={s}>
              <span aria-hidden>{["①", "②", "③"][i]}</span>
              <p>{s}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="container oc-st-form-section" id="requestst">
        <ServicioTecnicoForm />
      </section>
    </div>
  );
}

function HowIcon({ name }: { name: (typeof HOW)[number]["icon"] }) {
  if (name === "phone") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30.93 52.28" aria-hidden>
        <path
          fill="currentColor"
          d="M0,45.88V6.42C0,2.46,2.51,0,6.6,0h17.72c4.09,0,6.6,2.46,6.6,6.42v39.46c0,3.96-2.51,6.4-6.6,6.4H6.6c-4.09,0-6.6-2.44-6.6-6.4ZM23.97,49.16c2.54,0,3.83-1.24,3.83-3.73V6.86c0-2.46-1.29-3.71-3.83-3.71H6.96c-2.54,0-3.81,1.24-3.81,3.71v38.57c0,2.49,1.27,3.73,3.81,3.73h17.01ZM9.22,46.36c0-.61.41-1.02.99-1.02h10.54c.56,0,.99.41.99,1.02s-.43.99-.99.99h-10.54c-.58,0-.99-.41-.99-.99ZM10.99,6.3c0-.86.63-1.52,1.52-1.52h5.92c.86,0,1.52.66,1.52,1.52s-.66,1.52-1.52,1.52h-5.92c-.89,0-1.52-.66-1.52-1.52Z"
        />
      </svg>
    );
  }
  if (name === "thumb") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48.78 52.25" aria-hidden>
        <path
          fill="currentColor"
          d="M10.31,21.1h4.52c5.94-7.44,8.91-11.55,11.86-17.21,1.45-2.77,2.87-3.88,5-3.88,2.89,0,5,2.16,5,5.18,0,4.67-4.01,10.64-4.01,13.3,0,.74.56,1.17,1.5,1.17h8.76c3.28,0,5.84,2.59,5.84,5.87,0,1.45-.43,2.79-1.17,3.68.53.79.86,2.01.86,3.17,0,1.73-.69,3.35-1.83,4.34.41.76.63,1.78.63,2.79,0,1.96-.96,3.66-2.62,4.8.2.58.33,1.17.33,1.85,0,2.67-1.9,4.75-4.95,5.51-1.65.43-4.14.58-7.08.58h-3.25c-4.09,0-7.74-.91-10.77-2.49h-7.74c-6.07,0-11.2-6.42-11.2-14.27s4.65-14.4,10.31-14.4ZM11.2,46.85h3.81c-3.2-2.89-5-6.86-5-11.45s.84-7.85,2.89-11.38h-2.59c-3.88,0-7.39,5.05-7.39,11.48s3.88,11.35,8.28,11.35ZM29.88,49.36h3.07c2.74,0,5-.15,6.4-.51,1.8-.46,2.72-1.42,2.72-2.69,0-.61-.1-.94-.61-2.13-.3-.58-.13-1.07.46-1.37,1.62-.81,2.44-1.85,2.44-3.15,0-.89-.3-1.47-.84-2.41-.41-.76-.15-1.4.48-1.83.99-.74,1.55-1.73,1.55-2.89,0-.96-.33-1.73-.99-2.62-.46-.51-.41-1.09.13-1.55.81-.79,1.17-1.55,1.17-2.69,0-1.68-1.27-2.95-2.92-2.95h-8.4c-2.72,0-4.77-1.57-4.77-4.09,0-3.61,4.01-9.42,4.01-13.3,0-1.42-.79-2.26-1.98-2.26-.96,0-1.55.46-2.49,2.29-3.53,7.03-8.43,12.7-11.98,17.47-3.22,4.32-4.39,7.59-4.39,12.77,0,8.1,6.83,13.91,16.96,13.91Z"
        />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56.73 56.74" aria-hidden>
      <path
        fill="currentColor"
        d="M6.88,43.96v-5.87c0-.56-.18-.96-.58-1.4l-4.14-4.16c-2.87-2.89-2.89-5.41,0-8.3l4.14-4.19c.41-.41.58-.81.58-1.37v-5.89c0-4.11,1.8-5.89,5.89-5.89h5.87c.58,0,.99-.15,1.4-.56l4.16-4.16c2.89-2.89,5.41-2.89,8.3,0l4.19,4.16c.43.41.81.56,1.4.56h5.87c4.09,0,5.89,1.8,5.89,5.89v5.89c0,.56.18.96.58,1.37l4.14,4.19c2.87,2.89,2.89,5.41,0,8.3l-4.14,4.16c-.41.43-.58.84-.58,1.4v5.87c0,4.11-1.8,5.92-5.89,5.92h-5.87c-.58,0-.96.13-1.4.56l-4.19,4.14c-2.87,2.87-5.41,2.89-8.28,0l-4.19-4.14c-.43-.43-.81-.56-1.4-.56h-5.87c-4.09,0-5.89-1.83-5.89-5.92ZM19.71,46.76c.74,0,1.29.23,1.83.76l4.85,4.88c1.68,1.65,2.29,1.65,3.96,0l4.85-4.88c.53-.53,1.09-.76,1.83-.76h6.93c2.34,0,2.79-.46,2.79-2.79v-6.93c0-.74.23-1.29.74-1.8l4.9-4.88c1.65-1.68,1.65-2.29,0-3.94l-4.9-4.88c-.51-.53-.74-1.07-.74-1.8v-6.96c0-2.34-.46-2.79-2.79-2.79h-6.93c-.74,0-1.29-.2-1.83-.74l-4.85-4.9c-1.68-1.65-2.29-1.65-3.96,0l-4.85,4.9c-.53.53-1.09.74-1.83.74h-6.93c-2.36,0-2.79.43-2.79,2.79v6.96c0,.74-.23,1.27-.74,1.8l-4.9,4.88c-1.65,1.65-1.65,2.26,0,3.94l4.9,4.88c.51.51.74,1.07.74,1.8v6.93c0,2.34.46,2.79,2.79,2.79h6.93ZM23.97,39.52l-6.78-8.12c-.28-.38-.46-.81-.46-1.24,0-.86.69-1.55,1.52-1.55.53,0,.99.18,1.45.79l5.84,7.21,11.48-18.15c.38-.56.86-.89,1.37-.89.81,0,1.6.61,1.6,1.47,0,.41-.23.84-.46,1.22l-12.34,19.27c-.38.58-.91.89-1.55.89s-1.17-.25-1.68-.89Z"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 81 73.7" aria-hidden>
      <path
        fill="currentColor"
        d="M0,62.5c0-1.9.5-3.8,1.5-5.6L31,5.6c2.1-3.7,5.8-5.6,9.6-5.6s7.4,1.9,9.5,5.6l29.4,51.3c1,1.8,1.5,3.8,1.5,5.6,0,6.1-4.3,11.1-11.1,11.1H11.1c-6.8,0-11.1-5-11.1-11.1ZM68.8,65.6c2.2,0,3.6-1.7,3.6-3.6s-.2-1.3-.5-1.9L43.5,10.4c-.7-1.1-1.8-1.6-3-1.6s-2.4.5-3,1.6L9.2,60c-.3.7-.5,1.4-.5,2,0,1.9,1.4,3.6,3.5,3.6h56.5ZM35.8,55.3c0-2.5,2.1-4.3,4.7-4.3s4.7,1.8,4.7,4.3-2.1,4.3-4.7,4.3-4.7-1.8-4.7-4.3ZM36.8,43.2l-.6-17.4c0-2.4,1.7-4.1,4.2-4.1s4.3,1.7,4.3,4.1l-.6,17.3c0,2.4-1.4,3.6-3.6,3.6s-3.6-1.3-3.7-3.6h0Z"
      />
    </svg>
  );
}
