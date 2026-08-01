import Link from "next/link";
import { auth, isGoogleAuthConfigured, signIn, signOut } from "@/auth";

export const dynamic = "force-dynamic";

export const metadata = { title: "Cuenta" };

export default async function CuentaPage() {
  const session = await auth();
  const googleConfigured = isGoogleAuthConfigured();

  if (session?.user?.email) {
    const isAdmin = session.user.role === "admin";
    return (
      <section className="section">
        <div className="container">
          <div className="cuenta-card admin-card">
            <h1 style={{ marginTop: 0 }}>Tu cuenta</h1>
            <p className="muted">{session.user.email}</p>
            <div className="actions">
              {isAdmin && (
                <Link href="/admin" className="btn btn-secondary">
                  Ir al panel admin
                </Link>
              )}
              <Link href="/catalogo" className="btn btn-primary">
                Ir al catálogo
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button type="submit" className="btn btn-ghost">
                  Cerrar sesión
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container">
        <div className="cuenta-card admin-card">
          <h1 style={{ marginTop: 0 }}>Iniciar sesión</h1>
          <p className="muted">
            Ingresá con Google para recuperar tus datos en el checkout.
          </p>

          {googleConfigured ? (
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/" });
              }}
              style={{ display: "flex", justifyContent: "center" }}
            >
              <button
                type="submit"
                className="oc-btn oc-btn-dark"
                style={{ padding: "0.4rem 1rem", fontSize: "0.875rem" }}
              >
                Continuar con Google
              </button>
            </form>
          ) : (
            <div className="alert">
              Google OAuth no está configurado. Definí <code>AUTH_GOOGLE_ID</code> y{" "}
              <code>AUTH_GOOGLE_SECRET</code>.
            </div>
          )}

          <div className="actions" style={{ justifyContent: "center" }}>
            <Link href="/" className="btn btn-ghost">
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
