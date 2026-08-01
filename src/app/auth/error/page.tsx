import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Error de acceso" };

type SearchParams = Promise<{ error?: string }>;

export default async function AuthErrorPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const error = params.error || "Configuration";

  // Acceso denegado al panel → login admin
  if (error === "AccessDenied" || error === "OAuthAccountNotLinked") {
    redirect(`/admin/login?error=${encodeURIComponent(error)}`);
  }

  return (
    <section className="section">
      <div className="container">
        <div className="cuenta-card admin-card">
          <h1 style={{ marginTop: 0 }}>No se pudo iniciar sesión</h1>
          <p className="muted">
            Hubo un problema al completar el acceso con Google. Probá de nuevo desde la página de
            cuenta. Si el error continúa, revisá que el sitio use siempre el mismo dominio (con o
            sin www) definido en <code>AUTH_URL</code>.
          </p>
          {error && error !== "Configuration" && (
            <p className="muted" style={{ fontSize: "0.85rem" }}>
              Código: {error}
            </p>
          )}
          <div className="actions" style={{ justifyContent: "center", gap: "0.75rem" }}>
            <Link href="/cuenta" className="oc-btn oc-btn-dark" style={{ padding: "0.4rem 1rem", fontSize: "0.875rem" }}>
              Volver a cuenta
            </Link>
            <Link href="/" className="btn btn-ghost">
              Ir al inicio
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
