import type { ReactNode } from "react";
import { ServicioTecnicoForm } from "@/components/servicio-tecnico-form";

export const metadata = { title: "Servicio Técnico" };

const HIGHLIGHTS = [
  {
    title: "Cambia tu batería y pantalla",
    href: "https://www.oneclickstore.com/reemplazo-de-pantalla-o-bateria/",
    icon: "tools",
  },
  {
    title: "Programas de calidad Apple",
    href: "https://www.oneclickstore.com/programas-de-calidad/",
    icon: "medal",
  },
  {
    title: "Programa Exchange",
    href: "https://www.oneclickstore.com/programa-exchange/",
    icon: "exchange",
  },
] as const;

const DEVICES = [
  { src: "/oneclick/st/iphone.png", alt: "iPhone" },
  { src: "/oneclick/st/mac.png", alt: "Mac" },
  { src: "/oneclick/st/ipad.png", alt: "iPad" },
  { src: "/oneclick/st/watch.png", alt: "Apple Watch" },
  { src: "/oneclick/st/airpods.png", alt: "AirPods" },
  { src: "/oneclick/st/appletv.png", alt: "Apple TV" },
  { src: "/oneclick/st/beats.png", alt: "Beats" },
];

const FEATURES = [
  { title: "Técnicos certificados por Apple", icon: "tech" },
  { title: "Repuestos originales Apple", icon: "parts" },
  { title: "Garantía sobre las reparaciones", icon: "warranty" },
  { title: "Diagnóstico rápido y seguimiento online", icon: "track" },
  { title: "Cobertura oficial de garantía Apple", icon: "apple" },
] as const;

const SERVICES: { title: string; body: ReactNode }[] = [
  {
    title: "Diagnóstico",
    body: (
      <p>
        Nuestros técnicos certificados evalúan tu equipo, identifican el problema y te entregan una
        solución con presupuesto oficial.
      </p>
    ),
  },
  {
    title: "Cambio de batería",
    body: (
      <>
        <p>Reemplazo de batería con repuesto original Apple.</p>
        <p>Diagnóstico previo incluido.</p>
        <p>
          <strong>Tiempo estimado: 2 horas.</strong>
        </p>
      </>
    ),
  },
  {
    title: "Cambio de pantalla",
    body: (
      <>
        <p>Reparación con pantalla original Apple para iPhone o Mac.</p>
        <p>Diagnóstico previo incluido.</p>
        <p>
          <strong>Tiempo estimado: 2 horas.</strong>
        </p>
      </>
    ),
  },
  {
    title: "Asesoría personalizada",
    body: (
      <p>
        Capacitación sobre funciones clave de tu equipo: uso de apps Apple, creación y activación de
        Apple ID y configuración inicial.
      </p>
    ),
  },
  {
    title: "Actualización y restauración de software",
    body: (
      <p>
        Instalación de la última versión de iOS, iPadOS o macOS, restauración de sistema y
        optimización del equipo.
      </p>
    ),
  },
  {
    title: "Migración de información",
    body: (
      <p>
        Transferencia segura de datos entre dispositivos Apple. Evita perder información.
      </p>
    ),
  },
  {
    title: "Limpieza de equipos",
    body: (
      <p>
        Limpieza profesional externa e interna para mejorar la estética y el rendimiento de tu
        equipo Apple.
      </p>
    ),
  },
];

const STEPS = [
  "Traé tu equipo a la tienda o solicitá tu turno online con prioridad en atención.",
  "Recibí diagnóstico oficial",
  "Reparación con repuestos originales y garantía.",
  "Seguimiento online hasta la entrega.",
];

export default function ServicioTecnicoPage() {
  return (
    <div className="oc-st">
      <section className="container oc-st-hero">
        <h1>Servicio Técnico Apple Autorizado en Argentina</h1>
        <p>
          Soporte oficial para iPhone, iPad, Mac, Apple Watch y más. Reparaciones con repuestos
          originales y técnicos certificados Apple.
        </p>
        <a href="#requestst" className="oc-btn oc-btn-dark">
          Contactar Servicio Técnico OneClick
        </a>
      </section>

      <section className="container oc-st-cards">
        {HIGHLIGHTS.map((item) => (
          <a
            key={item.title}
            className="oc-st-card"
            href={item.href}
            target="_blank"
            rel="noreferrer"
          >
            <span className="oc-st-card-icon" aria-hidden>
              <HighlightIcon name={item.icon} />
            </span>
            <h2>{item.title}</h2>
            <span className="oc-st-card-more">Ver más &gt;</span>
          </a>
        ))}
      </section>

      <section className="container oc-st-devices">
        <h2>Reparamos dispositivos Apple bajo garantía y fuera de garantía.</h2>
        <div className="oc-st-devices-row">
          {DEVICES.map((d) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={d.alt} src={d.src} alt={d.alt} />
          ))}
        </div>
      </section>

      <section className="container oc-st-value">
        <h2>Todos los servicios que necesitás para tus dispositivos Apple.</h2>
        <p className="oc-st-value-lead">
          En OneClick te ofrecemos soluciones oficiales, rápidas y seguras para todos tus equipos
          Apple.
        </p>
        <div className="oc-st-features-grid">
          {FEATURES.map((f) => (
            <article key={f.title}>
              <span className="oc-st-feature-icon" aria-hidden>
                <FeatureIcon name={f.icon} />
              </span>
              <p>{f.title}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container oc-st-services">
        <div className="oc-st-accordion">
          {SERVICES.map((s) => (
            <details key={s.title} className="oc-st-acc-item">
              <summary>{s.title}</summary>
              <div className="oc-st-acc-body">{s.body}</div>
            </details>
          ))}
        </div>
        <div className="oc-st-services-cta">
          <a href="#requestst" className="oc-btn oc-btn-dark">
            Contactar Servicio Técnico OneClick
          </a>
        </div>
      </section>

      <section className="oc-st-steps-wrap">
        <div className="container oc-st-steps-inner">
          <h2>Cómo funciona el servicio técnico OneClick.</h2>
          <ol className="oc-st-steps">
            {STEPS.map((s, i) => (
              <li key={s}>
                <span aria-hidden>{["①", "②", "③", "④"][i]}</span>
                <p>{s}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container oc-st-form-section" id="requestst">
        <ServicioTecnicoForm />
      </section>
    </div>
  );
}

function HighlightIcon({ name }: { name: (typeof HIGHLIGHTS)[number]["icon"] }) {
  if (name === "tools") {
    return (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M14.7 6.3a4 4 0 01-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 015.4-5.4l-2.1 2.1-1.4-1.4 2.1-2.1z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "medal") {
    return (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="9" r="5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M9 13.5l-1.5 7L12 18l4.5 2.5L15 13.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="5" width="16" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 20h6M8 11l2.5 2.5L16 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FeatureIcon({ name }: { name: (typeof FEATURES)[number]["icon"] }) {
  const common = { width: 28, height: 28, viewBox: "0 0 24 24", fill: "none" as const };
  if (name === "tech") {
    return (
      <svg {...common} aria-hidden>
        <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M5.5 19c1.4-3.2 3.8-4.8 6.5-4.8S16.1 15.8 17.5 19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M16.5 6.5l1.2 1.2 2.5-2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "parts") {
    return (
      <svg {...common} aria-hidden>
        <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="15" cy="15" r="2.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M11 9h4M9 11v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "warranty") {
    return (
      <svg {...common} aria-hidden>
        <path d="M12 3l7 3v5c0 4.5-2.8 7.5-7 9-4.2-1.5-7-4.5-7-9V6l7-3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "track") {
    return (
      <svg {...common} aria-hidden>
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3 12a9 9 0 0118 0M12 3a9 9 0 010 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden>
      <path d="M12 3c-2.5 0-4.5 2.2-4.5 5 0 3.6 4.5 8.5 4.5 8.5S16.5 11.6 16.5 8c0-2.8-2-5-4.5-5z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9.5 19h5M12 16.5V19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
