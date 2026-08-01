import { isDevAuthBypassEnabled, isGoogleAuthConfigured, signIn } from "@/auth";

type SearchParams = Promise<{ error?: string }>;

export const metadata = { title: "Login admin" };

export default async function AdminLoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const denied = params.error === "AccessDenied" || params.error === "OAuthAccountNotLinked";
  const configError = params.error === "Configuration";
  const googleConfigured = isGoogleAuthConfigured();
  const devBypass = isDevAuthBypassEnabled();

  return (
    <div className="login-page" style={{ gridColumn: "1 / -1" }}>
      <div className="login-box">
        <h1 style={{ marginTop: 0 }}>OneClick Admin</h1>
        <p className="muted">
          {devBypass
            ? "Modo desarrollo activo: podés entrar sin Google."
            : "Ingresá con tu cuenta Google autorizada."}
        </p>
        {denied && (
          <div className="alert">
            Acceso denegado. Tu cuenta no está registrada como administrador activo.
          </div>
        )}
        {configError && (
          <div className="alert">
            Error de configuración de Auth. Verificá <code>AUTH_SECRET</code>,{" "}
            <code>AUTH_URL</code> (mismo host que usás en el navegador) y el redirect de Google{" "}
            <code>/api/auth/callback/google</code>.
          </div>
        )}

        {devBypass && (
          <form
            action={async () => {
              "use server";
              await signIn("dev-bypass", { redirectTo: "/admin" });
            }}
            style={{ marginBottom: "0.75rem" }}
          >
            <button type="submit" className="btn btn-secondary" style={{ width: "100%" }}>
              Entrar en modo desarrollo
            </button>
          </form>
        )}

        {googleConfigured ? (
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/admin" });
            }}
          >
            <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
              Ingresar con Google
            </button>
          </form>
        ) : (
          !devBypass && (
            <div className="alert">
              Google OAuth no está configurado. Definí <code>AUTH_GOOGLE_ID</code> y{" "}
              <code>AUTH_GOOGLE_SECRET</code>, o activá <code>AUTH_DEV_BYPASS=true</code>.
            </div>
          )
        )}
      </div>
    </div>
  );
}
