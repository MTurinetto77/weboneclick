import { clearCartCookie } from "@/lib/cart";
import {
  clampMpInstallments,
  DEFAULT_CUOTAS_MAX,
  maxInstallmentsFromCuotas,
} from "@/lib/cart";
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

export type CreatePreferenceOptions = {
  /**
   * Checkout Pro abierto por QR / link (continuar en el celular).
   * Sin `purpose: wallet_purchase` para que MP respete el tope de cuotas.
   */
  guestCheckout?: boolean;
  /** Tope informado por el checkout; se recorta al de los productos de la venta. */
  maxInstallmentsHint?: number;
};

async function maxInstallmentsForVenta(
  venta: VentaPendiente,
): Promise<number> {
  const ids = [
    ...new Set(
      venta.itemsCobro
        .map((i) => i.id_producto)
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];
  if (ids.length === 0) return DEFAULT_CUOTAS_MAX;
  const rows = await prisma.producto.findMany({
    where: { id_producto: { in: ids } },
    select: { cuotas_max: true },
  });
  return maxInstallmentsFromCuotas(rows.map((r) => r.cuotas_max));
}

function resolvePreferenceInstallments(
  tipo_pago: TipoPagoCheckout,
  fromVenta: number,
  hint?: number,
): number {
  const cap = clampMpInstallments(
    hint != null && hint > 0 ? Math.min(fromVenta, hint) : fromVenta,
  );
  return tipo_pago === "mercado_pago" ? 1 : cap;
}

function paymentMethodsForPreference(installments: number) {
  return {
    installments,
    default_installments: 1,
  };
}

/**
 * Crea (o reutiliza) una preference de Mercado Pago para Wallet / Checkout Pro.
 * Contado (`mercado_pago`): 1 cuota. Cuotas (`tarjeta`): hasta maxInstallments
 * de los productos de la venta (no del carrito, que puede ya estar vacío).
 */
export async function createOrReuseMercadoPagoPreference(
  venta: VentaPendiente,
  tipo_pago: TipoPagoCheckout,
  options?: CreatePreferenceOptions,
): Promise<CreatePreferenceResult> {
  const siteUrl = publicSiteUrl();
  const confBase = `${siteUrl}${confirmationPath(venta.id_venta, venta.access_token)}`;
  const confirmation_url = `${confBase}&mp=pending`;
  const publicHttps =
    siteUrl.startsWith("https://") &&
    !/localhost|127\.0\.0\.1/i.test(siteUrl);

  const fromVenta = await maxInstallmentsForVenta(venta);
  const installments = resolvePreferenceInstallments(
    tipo_pago,
    fromVenta,
    options?.maxInstallmentsHint,
  );
  const payment_methods = paymentMethodsForPreference(installments);

  const pagoExistente = await prisma.pago.findFirst({
    where: { id_venta: venta.id_venta, tipo_pago },
    select: { referencia: true },
  });
  // Wallet Brick: reutilizar la preference (purpose wallet_purchase).
  // QR: nunca reutilizar esa preference; Checkout Pro necesita la suya con `installments`.
  if (pagoExistente?.referencia && !options?.guestCheckout) {
    const preferenceId = pagoExistente.referencia;
    return {
      preferenceId,
      init_point: `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${encodeURIComponent(preferenceId)}`,
      confirmation_url,
      id_venta: venta.id_venta,
    };
  }

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
    metadata: {
      id_venta: String(venta.id_venta),
      max_installments: String(installments),
    },
    statement_descriptor: "ONECLICK",
    payment_methods,
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
    const useWalletPurpose = !options?.guestCheckout;
    if (useWalletPurpose) {
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
    } else {
      // QR / link: Checkout Pro completo para que `installments` limite cuotas.
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
