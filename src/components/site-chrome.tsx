import Link from "next/link";
import { auth, signOut } from "@/auth";
import { resolveCart } from "@/lib/cart";
import { getValorEnvioGratis } from "@/lib/parametros";
import { MAIN_NAV, type NavItem, type NavLink } from "@/lib/nav";
import { getActivePromosNav, isPromoIconImage } from "@/lib/promos";
import { CartDrawer, type CartDrawerItem } from "@/components/cart-drawer";
import { SearchOverlay } from "@/components/search-overlay";
import { uploadPublicUrl } from "@/lib/utils";

export async function SiteHeader() {
  const [cart, session, valorEnvioGratis, promos] = await Promise.all([
    resolveCart(),
    auth(),
    getValorEnvioGratis(),
    getActivePromosNav(),
  ]);
  const email = session?.user?.email;
  const isAdmin = session?.user?.role === "admin";

  const drawerItems: CartDrawerItem[] = cart.items.map((i) => ({
    id_producto: i.id_producto,
    titulo: i.titulo,
    cantidad: i.cantidad,
    precio: i.precio,
    imagen: i.imagen ? uploadPublicUrl(i.imagen) : null,
    subtotal: i.subtotal,
    disponible: i.disponible,
  }));

  const nav: NavItem[] = MAIN_NAV.map((item) => {
    if (item.dynamicChildren !== "promociones") return item;
    const children: NavLink[] = promos.map((p) => ({
      label: p.nombre,
      href: `/${p.slug}`,
      badge: p.subtitulo ?? undefined,
      icon: p.icono ?? undefined,
      variant: "product" as const,
    }));
    return { ...item, children };
  });

  return (
    <header className="oc-header-float oc-glass">
      <div className="oc-header-float-inner">
        <Link href="/" className="oc-logo-float">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/oneclick/footer/apple-premium.svg" alt="OneClick - Apple Premium Reseller" />
        </Link>

        <div className="oc-header-spacer" aria-hidden />

        <nav className="oc-pill-nav" aria-label="Principal">
          {nav.map((item) => (
            <div key={item.href + item.label} className="oc-pill-item">
              <Link href={item.href}>
                {item.label}
                {item.children && item.children.length > 0 && (
                  <span className="oc-pill-caret" aria-hidden />
                )}
              </Link>
              {item.children && item.children.length > 0 && (
                <div className="oc-pill-panel">
                  <div className="oc-pill-panel-head">
                    <p className="oc-pill-panel-title">{item.label}</p>
                    {item.shopLabel ? (
                      <Link href={item.href} className="oc-pill-panel-shop">
                        {item.shopLabel}
                      </Link>
                    ) : null}
                  </div>
                  <div className="oc-pill-panel-list">
                    {item.children.map((c) => {
                      const variant = c.variant || "product";
                      return (
                        <Link
                          key={c.href + c.label}
                          href={c.href}
                          className={
                            variant === "link" ? "oc-pill-panel-link" : "oc-pill-panel-product"
                          }
                        >
                          {c.badge ? <span className="oc-pill-badge">{c.badge}</span> : null}
                          <span className="oc-pill-panel-row">
                            <span className="oc-pill-panel-label">{c.label}</span>
                            {c.icon ? (
                              isPromoIconImage(c.icon) ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={uploadPublicUrl(c.icon)}
                                  alt=""
                                  className="oc-pill-panel-icon-img"
                                  aria-hidden
                                />
                              ) : (
                                <span className="oc-pill-panel-icon" aria-hidden>
                                  {c.icon}
                                </span>
                              )
                            ) : null}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="oc-pill-icons">
            <SearchOverlay />

            {email ? (
              <details className="user-menu">
                <summary className="oc-icon-btn oc-icon-btn-flat" aria-label="Cuenta">
                  <UserIcon />
                </summary>
                <div className="user-menu-panel">
                  <p className="user-menu-email" title={email}>
                    {email}
                  </p>
                  <Link href="/mi-cuenta" className="user-menu-item">
                    Mi cuenta
                  </Link>
                  <Link href="/lista-deseos" className="user-menu-item">
                    Lista de deseos
                  </Link>
                  {isAdmin && (
                    <Link href="/admin" className="user-menu-item">
                      Panel admin
                    </Link>
                  )}
                  <form
                    action={async () => {
                      "use server";
                      await signOut({ redirectTo: "/" });
                    }}
                  >
                    <button type="submit" className="btn btn-ghost user-menu-item">
                      Cerrar sesión
                    </button>
                  </form>
                </div>
              </details>
            ) : (
              <Link href="/mi-cuenta" className="oc-icon-btn oc-icon-btn-flat" aria-label="Login">
                <UserIcon />
              </Link>
            )}

            <CartDrawer
              items={drawerItems}
              itemCount={cart.itemCount}
              subtotal={cart.subtotal}
              canCheckout={cart.canCheckout}
              valorEnvioGratis={valorEnvioGratis}
            />
          </div>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="oc-footer">
      <div className="oc-footer-newsletter">
        <div className="container oc-footer-newsletter-inner">
          <h3>Suscribite a nuestro newsletter</h3>
          <form className="oc-newsletter" action="#" method="post">
            <input type="email" name="email" placeholder="Email" required />
            <button type="submit">Enviar</button>
          </form>
        </div>
      </div>

      <div className="oc-footer-main">
        <div className="container oc-footer-grid">
          <ul>
            <li>
              <Link href="/contacto">Contacto</Link>
            </li>
            <li>
              <Link href="/nosotros">Nosotros</Link>
            </li>
            <li>
              <Link href="/tiendas">Tiendas</Link>
            </li>
            <li>
              <Link href="/manda-tu-cv">Trabajá con Nosotros</Link>
            </li>
          </ul>
          <ul>
            <li>
              <Link href="/ocbeneficios">Promociones bancarias</Link>
            </li>
            <li>
              <Link href="/faqs">Preguntas Frecuentes</Link>
            </li>
            <li>
              <Link href="/empresas">Sector corporativo</Link>
            </li>
            <li>
              <Link href="/servicio-tecnico">Servicio técnico</Link>
            </li>
          </ul>
          <ul>
            <li>
              <Link href="/cambio-facturaciones">Cambio facturación</Link>
            </li>
            <li>
              <Link href="/fiscal#proveedores">Alta proveedores</Link>
            </li>
            <li>
              <Link href="/fiscal">Información fiscal</Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="oc-footer-bottom">
        <div className="container oc-footer-bottom-inner">
          <div className="oc-footer-brand">
            <Link href="/" className="oc-footer-logos" aria-label="OneClick inicio">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/oneclick/footer/apple-premium.svg"
                alt="OneClick - Apple Premium Reseller"
                className="oc-footer-apple"
              />
            </Link>
            <p className="oc-footer-copy">© {year} OneClick Store Argentina</p>
            <nav className="oc-footer-legal" aria-label="Legal">
              <Link href="/bases-y-condiciones">Términos y Condiciones</Link>
              <Link href="/libro-de-quejas">Libro de Quejas</Link>
              <Link href="/boton-de-arrepentimiento">Botón de Arrepentimiento</Link>
              <Link href="/gestion-de-garantia-post-venta">Garantía Post-Venta</Link>
            </nav>
          </div>

          <div className="oc-footer-social" aria-label="Redes sociales">
            <a
              href="https://www.instagram.com/oneclickarg/"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
            >
              <InstagramIcon />
            </a>
            <a
              href="https://www.facebook.com/oneclickarg/"
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
            >
              <FacebookIcon />
            </a>
            <a
              href="https://www.linkedin.com/company/oneclick-store-argentina/"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
            >
              <LinkedInIcon />
            </a>
            <a
              href="https://www.youtube.com/channel/UCMsgXUs_cV622LcAwzLghhA"
              target="_blank"
              rel="noreferrer"
              aria-label="YouTube"
            >
              <YouTubeIcon />
            </a>
          </div>

          <div className="oc-footer-badges">
            <a
              href="https://www.cace.org.ar/"
              target="_blank"
              rel="noreferrer"
              aria-label="CACE"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/oneclick/footer/cace.svg" alt="CACE" />
            </a>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/oneclick/footer/cybermonday.png" alt="CyberMonday Official Store" />
            <a
              href="http://qr.afip.gob.ar/?qr=oKt_2pVDQLOxfrlyvFV01w,,"
              target="_blank"
              rel="noreferrer"
              aria-label="Data Fiscal AFIP"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/oneclick/footer/data-fiscal.jpg" alt="Data Fiscal" />
            </a>
          </div>
        </div>
      </div>

      <a href="#top" className="oc-back-top" aria-label="Volver arriba">
        ↑
      </a>

      <a
        className="oc-whatsapp"
        href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "5491100000000"}`}
        target="_blank"
        rel="noreferrer"
      >
        <span className="oc-whatsapp-icon" aria-hidden>
          <WhatsAppIcon />
        </span>
        <span className="oc-whatsapp-label">Atención personalizada</span>
      </a>
    </footer>
  );
}

function UserIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="7.5" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5.5 21c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2zm-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4H7.6zm9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h3.1l.9-3H13v-2c0-.6.4-1 1-1z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6.5 9.5H3.7V20h2.8V9.5zM5.1 4A1.65 1.65 0 1 0 5.12 7.3 1.65 1.65 0 0 0 5.1 4zM20.3 13.3c0-3-1.6-4.4-3.8-4.4-1.7 0-2.5.9-2.9 1.6V9.5h-2.8c0 .8 0 10.5 0 10.5h2.8v-5.9c0-.3 0-.7.1-1 .3-.7.9-1.5 2-1.5 1.4 0 2 1.1 2 2.6V20h2.8v-6.7z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M23 12.2s0-3.1-.4-4.5c-.2-.9-.9-1.6-1.8-1.8C19.4 5.5 12 5.5 12 5.5s-7.4 0-8.8.4c-.9.2-1.6.9-1.8 1.8C1 9.1 1 12.2 1 12.2s0 3.1.4 4.5c.2.9.9 1.6 1.8 1.8 1.4.4 8.8.4 8.8.4s7.4 0 8.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.4.4-4.5.4-4.5zM9.8 15.5v-6.6l6.1 3.3-6.1 3.3z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.04 2C6.58 2 2.15 6.4 2.15 11.84c0 1.96.52 3.88 1.5 5.57L2 22l4.75-1.55a9.9 9.9 0 0 0 5.29 1.51h.01c5.46 0 9.89-4.4 9.89-9.84C21.94 6.4 17.5 2 12.04 2zm5.76 14.15c-.24.68-1.4 1.25-1.93 1.33-.5.08-1.12.11-1.81-.11-.42-.14-.95-.31-1.64-.6-2.89-1.25-4.77-4.16-4.92-4.35-.14-.19-1.2-1.6-1.2-3.05 0-1.45.76-2.16 1.03-2.45.27-.29.59-.36.79-.36h.57c.18 0 .42-.07.66.5.24.58.82 2 .89 2.15.07.15.12.32.02.52-.1.19-.15.32-.3.49-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.29.76 1.25 1.63 2.03 1.12 1 2.07 1.31 2.36 1.46.29.15.46.12.63-.07.17-.19.73-.85.93-1.14.2-.29.39-.24.66-.14.27.1 1.71.8 2 .95.29.15.49.22.56.34.07.12.07.7-.17 1.38z" />
    </svg>
  );
}
