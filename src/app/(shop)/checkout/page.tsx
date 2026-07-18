import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, isGoogleAuthConfigured } from "@/auth";
import { CheckoutDeliveryFields } from "@/components/checkout-delivery-fields";
import { resolveCart } from "@/lib/cart";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { confirmarVenta } from "./actions";
import { continueAsGuest, continueWithGoogle } from "./identity-actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Checkout" };

type SearchParams = Promise<{ modo?: string }>;

export default async function CheckoutPage({ searchParams }: { searchParams: SearchParams }) {
  const cart = await resolveCart();
  if (cart.items.length === 0) redirect("/carrito");
  if (!cart.canCheckout) redirect("/carrito");

  const params = await searchParams;
  const session = await auth();
  const isGuest = params.modo === "invitado";
  const isAuthenticated = !!session?.user?.email && !isGuest;

  if (!isAuthenticated && !isGuest) {
    return <CheckoutIdentityGate googleConfigured={isGoogleAuthConfigured()} />;
  }

  const cliente = isAuthenticated
    ? await prisma.cliente.findUnique({
        where: { mail: session!.user!.email!.toLowerCase() },
        include: { direccion_principal: true },
      })
    : null;

  const costoEnvio = 0;
  const total = cart.subtotal + costoEnvio;
  const mailLocked = isAuthenticated;

  return (
    <section className="section">
      <div className="container">
        <h1 style={{ marginTop: 0 }}>Checkout</h1>
        <p className="muted">
          {isAuthenticated
            ? cliente
              ? "Encontramos tus datos. Revisalos y confirmá el pedido."
              : "Completá tus datos para confirmar el pedido."
            : "Estás comprando como invitado. Completá tus datos para confirmar el pedido."}
        </p>
        {isAuthenticated && (
          <p className="muted" style={{ marginTop: "-0.5rem" }}>
            Sesión: {session!.user!.email} ·{" "}
            <Link href="/checkout?modo=invitado">Continuar como invitado</Link>
          </p>
        )}

        <div className="checkout-layout">
          <form action={confirmarVenta} className="checkout-form admin-card">
            <input
              type="hidden"
              name="checkout_mode"
              value={isAuthenticated ? "google" : "invitado"}
            />
            <h2>Datos del cliente</h2>
            <div className="form-grid-2">
              <div className="form-field">
                <label>Nombre</label>
                <input name="nombre" required defaultValue={cliente?.nombre ?? ""} />
              </div>
              <div className="form-field">
                <label>Apellido</label>
                <input name="apellido" required defaultValue={cliente?.apellido ?? ""} />
              </div>
            </div>
            <div className="form-field">
              <label>Mail</label>
              <input
                name="mail"
                type="email"
                required
                defaultValue={cliente?.mail ?? session?.user?.email ?? ""}
                readOnly={mailLocked}
              />
            </div>
            <div className="form-field">
              <label>Teléfono</label>
              <input name="telefono" defaultValue={cliente?.telefono ?? ""} />
            </div>
            <div className="form-grid-2">
              <div className="form-field">
                <label>Tipo documento</label>
                <select
                  name="tipo_documento"
                  defaultValue={cliente?.tipo_documento === "CUIT" ? "CUIT" : "DNI"}
                >
                  <option value="DNI">DNI</option>
                  <option value="CUIT">CUIT</option>
                </select>
              </div>
              <div className="form-field">
                <label>Número documento</label>
                <input name="numero_documento" defaultValue={cliente?.numero_documento ?? ""} />
              </div>
            </div>

            <CheckoutDeliveryFields
              addressDefaults={cliente?.direccion_principal ?? null}
              onlineNote={
                <p className="muted" style={{ marginTop: "0.75rem" }}>
                  El pago online con MercadoPago estará disponible en la Etapa 3. Por ahora el
                  pedido queda registrado como pendiente de pago.
                </p>
              }
            />

            <div className="actions">
              <Link href="/carrito" className="btn btn-ghost">
                Volver al carrito
              </Link>
              <button className="btn btn-primary" type="submit">
                Confirmar pedido
              </button>
            </div>
          </form>

          <aside className="order-summary admin-card">
            <h2>Resumen</h2>
            <ul className="order-summary-list">
              {cart.items.map((item) => (
                <li key={item.id_producto}>
                  <span>
                    {item.titulo} × {item.cantidad}
                  </span>
                  <strong>{formatPrice(item.subtotal)}</strong>
                </li>
              ))}
            </ul>
            <div className="order-summary-totals">
              <div>
                <span>Subtotal</span>
                <strong>{formatPrice(cart.subtotal)}</strong>
              </div>
              <div>
                <span>Envío</span>
                <strong>{formatPrice(costoEnvio)}</strong>
              </div>
              <div className="order-total">
                <span>Total</span>
                <strong>{formatPrice(total)}</strong>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function CheckoutIdentityGate({ googleConfigured }: { googleConfigured: boolean }) {
  return (
    <section className="section">
      <div className="container">
        <h1 style={{ marginTop: 0 }}>Finalizar compra</h1>
        <p className="muted">Elegí cómo querés continuar.</p>

        <div className="checkout-identity admin-card">
          {googleConfigured ? (
            <form action={continueWithGoogle}>
              <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
                Continuar con Google
              </button>
            </form>
          ) : (
            <div className="alert">
              Google no está configurado. Podés continuar como invitado.
            </div>
          )}

          <div className="checkout-identity-divider">
            <span>o</span>
          </div>

          <form action={continueAsGuest}>
            <button type="submit" className="btn btn-secondary" style={{ width: "100%" }}>
              Continuar como invitado
            </button>
          </form>

          <p className="muted" style={{ marginBottom: 0, marginTop: "1rem", textAlign: "center" }}>
            Si ya compraste antes con Google, cargaremos tus datos automáticamente.
          </p>

          <div className="actions" style={{ justifyContent: "center" }}>
            <Link href="/carrito" className="btn btn-ghost">
              Volver al carrito
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
