import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, isGoogleAuthConfigured } from "@/auth";
import { CheckoutDeliveryFields } from "@/components/checkout-delivery-fields";
import {
  FREE_SHIPPING_THRESHOLD,
  ivaIncluded,
  resolveCart,
} from "@/lib/cart";
import { formatPriceArs } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { confirmarVenta } from "./actions";
import { continueAsGuest, continueWithGoogle } from "./identity-actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Finalizar compra" };

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

  const mailLocked = isAuthenticated;
  const freeShipping = cart.subtotal >= FREE_SHIPPING_THRESHOLD;

  let iva105 = 0;
  let iva21 = 0;
  for (const item of cart.items) {
    if (item.subtotal == null || !item.disponible) continue;
    const tax = ivaIncluded(item.subtotal, item.ivaRate);
    if (item.ivaRate <= 0.11) iva105 += tax;
    else iva21 += tax;
  }

  return (
    <div className="oc-checkout-page">
      <div className="container">
        <h1 className="oc-checkout-title">Finalizar compra</h1>

        {isAuthenticated && (
          <p className="oc-checkout-session">
            Sesión: {session!.user!.email} ·{" "}
            <Link href="/checkout?modo=invitado">Continuar como invitado</Link>
          </p>
        )}

        <form action={confirmarVenta} className="oc-checkout-layout">
          <input
            type="hidden"
            name="checkout_mode"
            value={isAuthenticated ? "google" : "invitado"}
          />

          <div className="oc-checkout-billing">
            <h2>Detalles de facturación</h2>

            <div className="oc-checkout-grid-2">
              <div className="oc-checkout-field">
                <label>
                  Nombre <abbr title="obligatorio">*</abbr>
                </label>
                <input name="nombre" required defaultValue={cliente?.nombre ?? ""} />
              </div>
              <div className="oc-checkout-field">
                <label>
                  Apellidos <abbr title="obligatorio">*</abbr>
                </label>
                <input name="apellido" required defaultValue={cliente?.apellido ?? ""} />
              </div>
            </div>

            <div className="oc-checkout-grid-2">
              <div className="oc-checkout-field">
                <label>Tipo de documento</label>
                <select
                  name="tipo_documento"
                  defaultValue={cliente?.tipo_documento === "CUIT" ? "CUIT" : "DNI"}
                >
                  <option value="DNI">DNI</option>
                  <option value="CUIT">CUIT</option>
                </select>
              </div>
              <div className="oc-checkout-field">
                <label>Número de documento</label>
                <input
                  name="numero_documento"
                  defaultValue={cliente?.numero_documento ?? ""}
                />
              </div>
            </div>

            <div className="oc-checkout-field">
              <label>Teléfono</label>
              <input name="telefono" type="tel" defaultValue={cliente?.telefono ?? ""} />
            </div>

            <div className="oc-checkout-field">
              <label>
                Dirección de correo electrónico <abbr title="obligatorio">*</abbr>
              </label>
              <input
                name="mail"
                type="email"
                required
                defaultValue={cliente?.mail ?? session?.user?.email ?? ""}
                readOnly={mailLocked}
              />
            </div>

            <CheckoutDeliveryFields
              addressDefaults={cliente?.direccion_principal ?? null}
              onlineNote={
                <p className="oc-checkout-note">
                  El pago online con MercadoPago estará disponible próximamente. Por
                  ahora el pedido queda registrado como pendiente de pago.
                </p>
              }
            />
          </div>

          <aside className="oc-checkout-order">
            <div className="oc-checkout-order-box">
              <h2>Tu pedido</h2>
              <table className="oc-checkout-order-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.items.map((item) => (
                    <tr key={item.id_producto}>
                      <td>
                        {item.titulo}{" "}
                        <strong className="oc-checkout-qty">× {item.cantidad}</strong>
                      </td>
                      <td>{formatPriceArs(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th>Subtotal</th>
                    <td>{formatPriceArs(cart.subtotal)}</td>
                  </tr>
                  <tr>
                    <th>Envío</th>
                    <td>
                      {freeShipping
                        ? "Envío gratis"
                        : "Se calcula según tu dirección"}
                    </td>
                  </tr>
                  <tr className="oc-checkout-total">
                    <th>Total</th>
                    <td>
                      <strong>{formatPriceArs(cart.subtotal)}</strong>
                      {(iva105 > 0 || iva21 > 0) && (
                        <span className="oc-cart-tax">
                          (incluye
                          {iva105 > 0 && <> {formatPriceArs(iva105)} IVA 10.5%</>}
                          {iva105 > 0 && iva21 > 0 && ","}
                          {iva21 > 0 && <> {formatPriceArs(iva21)} IVA 21%</>})
                        </span>
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <p className="oc-checkout-privacy">
                Tus datos personales se utilizarán para procesar tu pedido, mejorar tu
                experiencia en esta web y otros propósitos descritos en nuestra política
                de privacidad.
              </p>

              <button type="submit" className="oc-btn oc-btn-dark oc-checkout-submit">
                Realizar el pedido
              </button>

              <Link href="/carrito" className="oc-checkout-back">
                ← Volver al carrito
              </Link>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}

function CheckoutIdentityGate({ googleConfigured }: { googleConfigured: boolean }) {
  return (
    <div className="oc-checkout-page">
      <div className="container">
        <h1 className="oc-checkout-title">Finalizar compra</h1>
        <p className="oc-checkout-session">Elegí cómo querés continuar.</p>

        <div className="oc-checkout-identity">
          {googleConfigured ? (
            <form action={continueWithGoogle}>
              <button type="submit" className="oc-btn oc-btn-dark oc-checkout-submit">
                Continuar con Google
              </button>
            </form>
          ) : (
            <div className="oc-cart-alert">
              Google no está configurado. Podés continuar como invitado.
            </div>
          )}

          <div className="oc-checkout-identity-divider">
            <span>o</span>
          </div>

          <form action={continueAsGuest}>
            <button
              type="submit"
              className="oc-btn oc-btn-ghost-dark oc-checkout-submit"
            >
              Continuar como invitado
            </button>
          </form>

          <p className="oc-checkout-note" style={{ textAlign: "center" }}>
            Si ya compraste antes con Google, cargaremos tus datos automáticamente.
          </p>

          <Link href="/carrito" className="oc-checkout-back">
            ← Volver al carrito
          </Link>
        </div>
      </div>
    </div>
  );
}
