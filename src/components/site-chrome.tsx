import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getCartItemCount } from "@/lib/cart";
import { MAIN_NAV } from "@/lib/nav";

export async function SiteHeader() {
  const [cartCount, session] = await Promise.all([getCartItemCount(), auth()]);
  const email = session?.user?.email;
  const isAdmin = session?.user?.role === "admin";

  return (
    <header className="oc-header-float">
      <div className="oc-header-float-inner">
        <Link href="/" className="oc-logo-float">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/oneclick/logo.svg" alt="OneClick" />
        </Link>

        <nav className="oc-pill-nav" aria-label="Principal">
          {MAIN_NAV.map((item) => (
            <div key={item.href + item.label} className="oc-pill-item">
              <Link href={item.href}>
                {item.label}
                {item.children && item.children.length > 0 && (
                  <span className="oc-pill-caret" aria-hidden />
                )}
              </Link>
              {item.children && item.children.length > 0 && (
                <div className="oc-pill-panel">
                  <p className="oc-pill-panel-title">{item.label}</p>
                  {item.children.map((c) => (
                    <Link key={c.href + c.label} href={c.href}>
                      {c.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="oc-pill-icons">
            <details className="oc-search-popover">
              <summary className="oc-icon-btn oc-icon-btn-flat" aria-label="Buscar" title="Buscar">
                <SearchIcon />
              </summary>
              <form className="oc-search-flyout" action="/shop" method="get">
                <input type="search" name="q" placeholder="Buscar productos…" />
                <button type="submit">Buscar</button>
              </form>
            </details>

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

            <Link href="/carrito" className="oc-icon-btn oc-icon-btn-flat nav-cart" aria-label="Carrito">
              <BagIcon />
              <span className="cart-badge">{cartCount}</span>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="oc-footer">
      <div className="container oc-footer-grid">
        <div>
          <h4>OneClick</h4>
          <p>Apple Premium Reseller y Distribuidor Oficial JBL</p>
          <ul>
            <li>
              <Link href="/nosotros">Nosotros</Link>
            </li>
            <li>
              <Link href="/contacto">Contacto</Link>
            </li>
            <li>
              <Link href="/tiendas">Tiendas</Link>
            </li>
            <li>
              <Link href="/manda-tu-cv">Trabajá con Nosotros</Link>
            </li>
          </ul>
        </div>
        <div>
          <h4>Ayuda</h4>
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
        </div>
        <div>
          <h4>Legal</h4>
          <ul>
            <li>
              <Link href="/bases-y-condiciones">Bases y Condiciones</Link>
            </li>
            <li>
              <Link href="/libro-de-quejas">Libro de Quejas</Link>
            </li>
            <li>
              <Link href="/boton-de-arrepentimiento">Botón de Arrepentimiento</Link>
            </li>
            <li>
              <Link href="/gestion-de-garantia-post-venta">Garantía Post-Venta</Link>
            </li>
            <li>
              <Link href="/politica-privacidad">Política de Privacidad</Link>
            </li>
          </ul>
        </div>
        <div>
          <h4>Newsletter</h4>
          <p>Suscribite y recibí novedades y ofertas.</p>
          <form className="oc-newsletter" action="#" method="post">
            <input type="email" name="email" placeholder="Email" required />
            <button type="submit">Enviar</button>
          </form>
        </div>
      </div>
      <div className="oc-footer-bottom">
        <div className="container">
          <p>Copyright ©{new Date().getFullYear()} — OneClick Store Argentina</p>
        </div>
      </div>
    </footer>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 19c1.5-3.5 4-5 7-5s5.5 1.5 7 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 8h12l-1 12H7L6 8z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 8V7a3 3 0 016 0v1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
