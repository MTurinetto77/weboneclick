import Link from "next/link";
import { auth, isGoogleAuthConfigured, signIn, signOut } from "@/auth";

export const dynamic = "force-dynamic";

export const metadata = { title: "Cuenta" };

type SearchParams = Promise<{ callbackUrl?: string }>;

export default async function CuentaPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const callbackUrl = safeCallback(params.callbackUrl) || "/";
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
            Ingresá con Google para recuperar tus datos en el checkout o administrar la tienda.
          </p>

          {googleConfigured ? (
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: callbackUrl });
              }}
            >
              <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
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

function safeCallback(url?: string): string | null {
  if (!url) return null;
  if (!url.startsWith("/") || url.startsWith("//")) return null;
  return url;
}
