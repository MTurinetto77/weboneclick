import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, isGoogleAuthConfigured } from "@/auth";
import { CheckoutCoupon } from "@/components/checkout-coupon";
import { CheckoutDeliveryFields } from "@/components/checkout-delivery-fields";
import { CheckoutGiftSelector } from "@/components/checkout-gift-selector";
import { CheckoutIdempotencyBootstrap } from "@/components/checkout-idempotency-bootstrap";
import { CheckoutEnvioTotalRows } from "@/components/checkout-order-totals";
import { CheckoutPaymentOptions } from "@/components/checkout-payment-options";
import { computeTotals } from "@/lib/checkout-venta";
import {
  cartMaxInstallments,
  estimateIvaRate,
  ivaIncluded,
  resolveCart,
  resolveCheckoutEntregaDisponibilidad,
} from "@/lib/cart";
import { resolveAppliedCupon } from "@/lib/cupones";
import type { AlignGrossItem } from "@/lib/odoo-amount";
import { formatPriceArs } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { isMercadoPagoConfigured } from "@/lib/mercadopago";
import { getRegaloApplicable } from "@/lib/regalos";
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
    ? await prisma.cliente.findFirst({
        where: {
          OR: [
            { mail: session!.user!.email!.toLowerCase() },
            ...(session!.user!.id > 0
              ? [{ id_usuario: session!.user!.id }]
              : []),
          ],
        },
        include: {
          direccion_principal: true,
          direcciones: { orderBy: { id_direccion: "desc" }, take: 1 },
        },
      })
    : null;

  const mailLocked = isAuthenticated;
  const mercadoPagoConfigured = isMercadoPagoConfigured();
  const mpPublicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY?.trim() || null;
  const cupon = await resolveAppliedCupon();
  const cuponMonto = cupon?.monto ?? 0;
  const totalsContado = computeTotals(cart, "mercado_pago", cuponMonto);
  const totalsTarjeta = computeTotals(cart, "tarjeta", cuponMonto);
  const descuentoCupon = totalsTarjeta.descuentoCupon;
  const regalo = await getRegaloApplicable(cart.subtotal);

  const itemsTarjeta: AlignGrossItem[] = totalsTarjeta.itemsCobro.map((i) => ({
    ...i,
    rate: estimateIvaRate(i.titulo),
  }));
  const itemsContado: AlignGrossItem[] = totalsContado.itemsCobro.map((i) => ({
    ...i,
    rate: estimateIvaRate(i.titulo),
  }));

  const addressDefaults =
    cliente?.direccion_principal ?? cliente?.direcciones[0] ?? null;

  const { envioDisponible, retiroDisponible } =
    await resolveCheckoutEntregaDisponibilidad(cart.items);

  // Si el cliente aún no tiene nombre real (alta Google), usar el de la sesión
  const sessionName = (session?.user?.name || "").trim();
  const sessionParts = sessionName.split(/\s+/).filter(Boolean);
  const defaultNombre =
    cliente?.nombre && cliente.nombre !== "Cliente"
      ? cliente.nombre
      : sessionParts[0] || cliente?.nombre || "";
  const defaultApellido =
    cliente?.apellido && cliente.apellido !== "-" && cliente.apellido !== "Google"
      ? cliente.apellido
      : sessionParts.length > 1
        ? sessionParts.slice(1).join(" ")
        : cliente?.apellido && cliente.apellido !== "-"
          ? cliente.apellido
          : "";

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

        <form action={confirmarVenta} className="oc-checkout-layout">
          <CheckoutIdempotencyBootstrap />
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
                <input name="nombre" required defaultValue={defaultNombre} />
              </div>
              <div className="oc-checkout-field">
                <label>
                  Apellidos <abbr title="obligatorio">*</abbr>
                </label>
                <input name="apellido" required defaultValue={defaultApellido} />
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
                Responsabilidad impositiva <abbr title="obligatorio">*</abbr>
              </label>
              <select
                name="responsabilidad_impositiva"
                required
                defaultValue={
                  cliente?.responsabilidad_impositiva === "RI" ? "RI" : "CF"
                }
              >
                <option value="CF">Consumidor Final</option>
                <option value="RI">IVA responsable inscripto</option>
              </select>
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
              addressDefaults={addressDefaults}
              cartSubtotal={cart.subtotal}
              envioDisponible={envioDisponible}
              retiroDisponible={retiroDisponible}
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
                  {descuentoCupon > 0 && (
                    <tr>
                      <th>Cupón {cupon?.codigo}</th>
                      <td>−{formatPriceArs(descuentoCupon)}</td>
                    </tr>
                  )}
                  <CheckoutEnvioTotalRows
                    items={itemsTarjeta}
                    iva105={iva105}
                    iva21={iva21}
                  />
                </tfoot>
              </table>

              <CheckoutCoupon
                appliedCodigo={cupon?.codigo}
                appliedMonto={descuentoCupon > 0 ? descuentoCupon : null}
              />

              {regalo ? <CheckoutGiftSelector regalo={regalo} /> : null}

              <CheckoutPaymentOptions
                itemsTarjeta={itemsTarjeta}
                itemsContado={itemsContado}
                maxInstallments={cartMaxInstallments(cart.items)}
                mpConfigured={mercadoPagoConfigured}
                publicKey={mpPublicKey}
              />

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
