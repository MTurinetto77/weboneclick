"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { clearCartCookie } from "@/lib/cart";
import { rotateCheckoutIdempotencyKey } from "@/lib/checkout-idempotency";
import {
  confirmationPath,
  createPendingVenta,
} from "@/lib/checkout-venta";
import { clearCuponCookie, releaseCuponForVenta } from "@/lib/cupones";
import { mercadoPagoPreference, publicSiteUrl } from "@/lib/mercadopago";
import { prisma } from "@/lib/prisma";

/**
 * Checkout con redirección a Mercado Pago (opción "contado, 10% de descuento").
 * El pago con tarjeta embebido va por /api/mercadopago/pay (Card Payment Brick).
 */
export async function confirmarVenta(formData: FormData) {
  const tipo_pago = String(formData.get("tipo_pago") || "").trim();
  if (tipo_pago !== "mercado_pago") {
    throw new Error(
      "Para pagar con tarjeta completá el formulario de tarjeta del checkout.",
    );
  }

  const session = await auth();
  const fields: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") fields[key] = value;
  }

  const venta = await createPendingVenta(
    fields,
    "mercado_pago",
    session?.user?.email ?? null,
    session?.user?.id ?? null,
  );

  const siteUrl = publicSiteUrl();
  const notificationUrl = siteUrl.startsWith("https://")
    ? `${siteUrl}/api/mercadopago/webhook`
    : undefined;

  const confBase = `${siteUrl}${confirmationPath(venta.id_venta, venta.access_token)}`;

  const pagoExistente = await prisma.pago.findFirst({
    where: { id_venta: venta.id_venta, tipo_pago: "mercado_pago" },
    select: { referencia: true },
  });
  if (pagoExistente?.referencia) {
    await clearCartCookie();
    await clearCuponCookie();
    await rotateCheckoutIdempotencyKey();
    revalidatePath("/carrito");
    redirect(
      `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${encodeURIComponent(pagoExistente.referencia)}`,
    );
  }

  let preference;
  try {
    const preferenceItems = [
      ...venta.itemsCobro.map((item) => ({
        id: String(item.id_producto),
        title: item.titulo,
        quantity: item.cantidad,
        unit_price: item.unit_price,
        currency_id: "ARS" as const,
      })),
    ];
    // El envío debe ir en la preference: si no, MP cobra solo productos y la
    // venta queda pendiente porque total local > transaction_amount.
    if (venta.costo_envio > 0) {
      preferenceItems.push({
        id: "shipping",
        title: "Costo de envío",
        quantity: 1,
        unit_price: venta.costo_envio,
        currency_id: "ARS",
      });
    }

    preference = await mercadoPagoPreference().create({
      body: {
        items: preferenceItems,
        payer: {
          name: venta.nombre,
          surname: venta.apellido,
          email: venta.mail,
        },
        external_reference: String(venta.id_venta),
        metadata: { id_venta: venta.id_venta },
        back_urls: {
          success: `${confBase}&mp=success`,
          pending: `${confBase}&mp=pending`,
          failure: `${confBase}&mp=failure`,
        },
        auto_return: "approved",
        notification_url: notificationUrl,
        statement_descriptor: "ONECLICK",
      },
    });
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

  if (!preference.init_point) {
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
    where: { id_venta: venta.id_venta, tipo_pago: "mercado_pago" },
    data: { referencia: preference.id ?? null },
  });

  await clearCartCookie();
  await clearCuponCookie();
  await rotateCheckoutIdempotencyKey();
  revalidatePath("/carrito");
  redirect(preference.init_point);
}
