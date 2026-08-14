import { clearCartCookie } from "@/lib/cart";
import { cartMaxInstallments, resolveCart } from "@/lib/cart";
import { rotateCheckoutIdempotencyKey } from "@/lib/checkout-idempotency";
import {
  confirmationPath,
  type TipoPagoCheckout,
  type VentaPendiente,
} from "@/lib/checkout-venta";
import { clearCuponCookie, releaseCuponForVenta } from "@/lib/cupones";
import { mercadoPagoPreference, publicSiteUrl } from "@/lib/mercadopago";
import {
  buildMpItems,
  buildPreferencePayer,
  buildPreferenceShipments,
  toMpPayerSource,
} from "@/lib/mp-payer-payload";
import { prisma } from "@/lib/prisma";

export type CreatePreferenceResult = {
  preferenceId: string;
  init_point: string;
  confirmation_url: string;
  id_venta: number;
};

/**
 * Crea (o reutiliza) una preference de Mercado Pago para Wallet / Checkout Pro.
 * Contado (`mercado_pago`): 1 cuota. Cuotas (`tarjeta`): hasta maxInstallments del carrito.
 */
export async function createOrReuseMercadoPagoPreference(
  venta: VentaPendiente,
  tipo_pago: TipoPagoCheckout,
): Promise<CreatePreferenceResult> {
  const siteUrl = publicSiteUrl();
  const confBase = `${siteUrl}${confirmationPath(venta.id_venta, venta.access_token)}`;
  const confirmation_url = `${confBase}&mp=pending`;
  const publicHttps =
    siteUrl.startsWith("https://") &&
    !/localhost|127\.0\.0\.1/i.test(siteUrl);

  const pagoExistente = await prisma.pago.findFirst({
    where: { id_venta: venta.id_venta, tipo_pago },
    select: { referencia: true },
  });
  if (pagoExistente?.referencia) {
    const preferenceId = pagoExistente.referencia;
    return {
      preferenceId,
      init_point: `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${encodeURIComponent(preferenceId)}`,
      confirmation_url,
      id_venta: venta.id_venta,
    };
  }

  const cart = await resolveCart();
  const maxInstallments = Math.max(1, cartMaxInstallments(cart.items));
  // Contado: solo 1 pago. Cuotas: tope del producto.
  const installments = tipo_pago === "mercado_pago" ? 1 : maxInstallments;

  const src = toMpPayerSource(venta);
  const preferenceItems = buildMpItems(src).map((item) => ({
    ...item,
    currency_id: "ARS" as const,
  }));

  const preferenceBody = {
    items: preferenceItems,
    payer: buildPreferencePayer(src),
    shipments: buildPreferenceShipments(src),
    external_reference: String(venta.id_venta),
    metadata: { id_venta: String(venta.id_venta) },
    statement_descriptor: "ONECLICK",
    payment_methods: {
      installments,
      default_installments: 1,
    },
    ...(publicHttps
      ? {
          back_urls: {
            success: `${confBase}&mp=success`,
            pending: `${confBase}&mp=pending`,
            failure: `${confBase}&mp=failure`,
          },
          auto_return: "approved" as const,
          notification_url: `${siteUrl}/api/mercadopago/webhook`,
        }
      : {}),
  };

  let preference;
  try {
    try {
      preference = await mercadoPagoPreference().create({
        body: {
          ...preferenceBody,
          purpose: "wallet_purchase",
        },
      });
    } catch (firstError) {
      console.warn(
        "[mp-preference] wallet_purchase falló, reintento sin purpose:",
        firstError,
      );
      preference = await mercadoPagoPreference().create({
        body: preferenceBody,
      });
    }
  } catch (error) {
    await prisma.venta
      .update({
        where: { id_venta: venta.id_venta },
        data: { estado: "cancelada" },
      })
      .catch(() => undefined);
    await releaseCuponForVenta(venta.id_venta).catch(() => undefined);
    throw error;
  }

  if (!preference.id || !preference.init_point) {
    await prisma.venta
      .update({
        where: { id_venta: venta.id_venta },
        data: { estado: "cancelada" },
      })
      .catch(() => undefined);
    await releaseCuponForVenta(venta.id_venta).catch(() => undefined);
    throw new Error("Mercado Pago no devolvió una URL de pago");
  }

  await prisma.pago.updateMany({
    where: { id_venta: venta.id_venta, tipo_pago },
    data: { referencia: preference.id },
  });

  return {
    preferenceId: preference.id,
    init_point: preference.init_point,
    confirmation_url,
    id_venta: venta.id_venta,
  };
}

/** Tras crear preference: limpia carrito/cupón e idempotency para el siguiente pedido. */
export async function finalizeCheckoutAfterPreference(): Promise<void> {
  await clearCartCookie();
  await clearCuponCookie();
  await rotateCheckoutIdempotencyKey();
}
