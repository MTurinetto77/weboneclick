import Link from "next/link";
import { prisma } from "@/lib/prisma";

const SOCIAL = [
  {
    href: "https://www.facebook.com/oneclickarg/",
    label: "Facebook",
    icon: FacebookIcon,
  },
  {
    href: "https://www.linkedin.com/company/oneclick-store-argentina/",
    label: "LinkedIn",
    icon: LinkedInIcon,
  },
  {
    href: "https://www.youtube.com/channel/UCMsgXUs_cV622LcAwzLghhA",
    label: "YouTube",
    icon: YouTubeIcon,
  },
  {
    href: "https://www.instagram.com/oneclickarg/",
    label: "Instagram",
    icon: InstagramIcon,
  },
] as const;

type ContactHelpBlockProps = {
  /** Título superior centrado (ej. "Estamos para ayudarte") */
  title?: string;
  showRule?: boolean;
  /** Variante Nosotros: contacto corporativo nominado + CTA WhatsApp */
  variant?: "contacto" | "nosotros";
};

export async function ContactHelpBlock({
  title,
  showRule = false,
  variant = "contacto",
}: ContactHelpBlockProps) {
  const tiendas = await prisma.tienda.findMany({
    where: { activo: true },
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
  });

  const waPhone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "5493415404538";
  const isNosotros = variant === "nosotros";

  return (
    <div className="oc-contacto-block">
      {title ? (
        <header className="oc-contacto-block-head">
          <h2>{title}</h2>
          {showRule ? <hr className="oc-contacto-rule" /> : null}
        </header>
      ) : null}

      <div className="oc-contacto-grid">
        <section className="oc-contacto-col" aria-labelledby="help-tiendas">
          <h3 id="help-tiendas" className="oc-contacto-col-title">
            <span className="oc-contacto-icon" aria-hidden>
              <StoreIcon />
            </span>
            Tiendas
          </h3>
          <ul className="oc-contacto-stores">
            {tiendas.map((t) => (
              <li key={t.id_tienda}>
                <strong>{t.nombre}</strong>
                <span>{t.direccion}</span>
              </li>
            ))}
            {!tiendas.length && (
              <li>
                <span className="muted">Pronto publicaremos el listado de tiendas.</span>
              </li>
            )}
          </ul>
        </section>

        <section className="oc-contacto-col" aria-labelledby="help-atencion">
          <h3 id="help-atencion" className="oc-contacto-col-title">
            <span className="oc-contacto-icon" aria-hidden>
              <PhoneIcon />
            </span>
            Atención al cliente
          </h3>

          <p className="oc-contacto-lead">
            Si necesitas asistencia, puedes escribirnos por WhatsApp o enviarnos un email a{" "}
            <a href="mailto:info@oneclickstore.com">info@oneclickstore.com</a>
          </p>

          <div className="oc-contacto-dual">
            <span className="oc-contacto-dual-label">Teléfono tiendas</span>
            <a href="tel:08003451663" className="oc-contacto-dual-value">
              0800 345 1663
            </a>
          </div>

          {isNosotros ? (
            <div className="oc-contacto-dual oc-contacto-dual-stack">
              <span className="oc-contacto-dual-label">Venta Corporativa</span>
              <span className="oc-contacto-dual-value-sm">Alejandro Encina</span>
              <a href="mailto:alejandroe@oneclickstore.com" className="oc-contacto-dual-value-sm">
                alejandroe@oneclickstore.com
              </a>
            </div>
          ) : (
            <div className="oc-contacto-dual">
              <span className="oc-contacto-dual-label">Venta Corporativa</span>
              <a href="mailto:corporativo@oneclickstore.com" className="oc-contacto-dual-value-sm">
                corporativo@oneclickstore.com
              </a>
            </div>
          )}

          <Link href="/manda-tu-cv" className="oc-contacto-dual oc-contacto-dual-link">
            <span className="oc-contacto-dual-label">Trabaja con nosotros</span>
            <span className="oc-contacto-dual-value-sm">Envianos tu CV</span>
          </Link>

          <div className="oc-contacto-social-block">
            <h4>Seguinos</h4>
            <div className="oc-contacto-social">
              {SOCIAL.map(({ href, label, icon: Icon }) => (
                <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label}>
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {isNosotros ? (
            <a
              className="oc-contacto-chat"
              href={`https://wa.me/${waPhone}`}
              target="_blank"
              rel="noreferrer"
            >
              <WhatsAppGlyph />
              Chatea con nosotros
            </a>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function StoreIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10h16v10H4V10z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M3 10l1.5-5h15L21 10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9 20v-6h6v6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="8" cy="7.5" r="0.9" fill="#e3002b" />
      <circle cx="12" cy="7.5" r="0.9" fill="#e3002b" />
      <circle cx="16" cy="7.5" r="0.9" fill="#e3002b" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8.5 3.5h3.2l1.1 3.3-1.6 1.1a12.5 12.5 0 005.4 5.4l1.1-1.6 3.3 1.1v3.2c0 .9-.7 1.6-1.6 1.6C10.8 18.6 5.4 13.2 5.4 6.1c0-.9.7-1.6 1.6-1.6z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WhatsAppGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.04 2C6.58 2 2.15 6.4 2.15 11.84c0 1.96.52 3.88 1.5 5.57L2 22l4.75-1.55a9.9 9.9 0 0 0 5.29 1.51h.01c5.46 0 9.89-4.4 9.89-9.84C21.94 6.4 17.5 2 12.04 2zm5.76 14.15c-.24.68-1.4 1.25-1.93 1.33-.5.08-1.12.11-1.81-.11-.42-.14-.95-.31-1.64-.6-2.89-1.25-4.77-4.16-4.92-4.35-.14-.19-1.2-1.6-1.2-3.05 0-1.45.76-2.16 1.03-2.45.27-.29.59-.36.79-.36h.57c.18 0 .42-.07.66.5.24.58.82 2 .89 2.15.07.15.12.32.02.52-.1.19-.15.32-.3.49-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.29.76 1.25 1.63 2.03 1.12 1 2.07 1.31 2.36 1.46.29.15.46.12.63-.07.17-.19.73-.85.93-1.14.2-.29.39-.24.66-.14.27.1 1.71.8 2 .95.29.15.49.22.56.34.07.12.07.7-.17 1.38z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M14 9h3V6h-3c-1.7 0-3 1.3-3 3v2H9v3h2v7h3v-7h2.5l.5-3H14V9z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6.5 9H3.7v11.3h2.8V9zM5.1 3.7a1.6 1.6 0 100 3.2 1.6 1.6 0 000-3.2zM20.3 13.2c0-2.4-1.3-3.9-3.7-3.9-1.3 0-2.2.6-2.6 1.3V9.3h-2.8v11h2.8v-6.1c0-1.6.9-2.3 1.9-2.3 1 0 1.6.7 1.6 2.3v6.1h2.8v-6.1z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21.6 7.2a2.5 2.5 0 00-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 002.4 7.2 26 26 0 002 12a26 26 0 00.4 4.8 2.5 2.5 0 001.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 001.8-1.8A26 26 0 0022 12a26 26 0 00-.4-4.8zM10 15.2V8.8L15.5 12 10 15.2z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 7.2A4.8 4.8 0 1016.8 12 4.8 4.8 0 0012 7.2zm0 7.9A3.1 3.1 0 1115.1 12 3.1 3.1 0 0112 15.1z" />
      <path d="M17.5 6.3a1.1 1.1 0 11-1.1 1.1 1.1 1.1 0 011.1-1.1z" />
      <path d="M12 3.6c2.4 0 2.7 0 3.6.1a5 5 0 013.7 3.7c.1.9.1 1.2.1 3.6s0 2.7-.1 3.6a5 5 0 01-3.7 3.7c-.9.1-1.2.1-3.6.1s-2.7 0-3.6-.1a5 5 0 01-3.7-3.7c-.1-.9-.1-1.2-.1-3.6s0-2.7.1-3.6a5 5 0 013.7-3.7c.9-.1 1.2-.1 3.6-.1m0-1.6c-2.5 0-2.8 0-3.7.1A6.6 6.6 0 002.1 8.3C2 9.2 2 9.5 2 12s0 2.8.1 3.7a6.6 6.6 0 006.2 6.2c.9.1 1.2.1 3.7.1s2.8 0 3.7-.1a6.6 6.6 0 006.2-6.2c.1-.9.1-1.2.1-3.7s0-2.8-.1-3.7a6.6 6.6 0 00-6.2-6.2c-.9-.1-1.2-.1-3.7-.1z" />
    </svg>
  );
}
