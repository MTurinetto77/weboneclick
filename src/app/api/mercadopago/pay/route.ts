import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { clearCartCookie } from "@/lib/cart";
import { rotateCheckoutIdempotencyKey } from "@/lib/checkout-idempotency";
import {
  confirmationPath,
  createPendingVenta,
} from "@/lib/checkout-venta";
import { releaseCuponForVenta } from "@/lib/cupones";
import { mercadoPagoPayment, publicSiteUrl } from "@/lib/mercadopago";
import { applyMercadoPagoPayment } from "@/lib/mp-payment-sync";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitClientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

type CardFormData = {
  token?: string;
  issuer_id?: string | number;
  payment_method_id?: string;
  installments?: number;
  payer?: {
    email?: string;
    identification?: { type?: string; number?: string };
  };
};

type PayBody = {
  fields?: Record<string, string>;
  card?: CardFormData;
};

function publicPayError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  // Errores de validación de negocio: se pueden mostrar.
  if (
    message &&
    !/mercadopago|access.?token|api|internal|ECONN|timeout/i.test(message)
  ) {
    return message;
  }
  return "No pudimos procesar el pago";
}

/** Pago con tarjeta embebido (Card Payment Brick) sin salir del sitio. */
export async function POST(req: NextRequest) {
  const limited = rateLimit(rateLimitClientKey(req, "mp-pay"), {
    limit: 20,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Demasiados intentos. Probá de nuevo en un momento." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  let body: PayBody;
  try {
    body = (await req.json()) as PayBody;
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const fields = body.fields ?? {};
  const card = body.card ?? {};
  if (!card.token || !card.payment_method_id) {
    return NextResponse.json(
      { error: "Faltan los datos de la tarjeta" },
      { status: 400 },
    );
  }

  const session = await auth();

  let venta;
  try {
    venta = await createPendingVenta(
      fields,
      "tarjeta",
      session?.user?.email ?? null,
      session?.user?.id ?? null,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Datos inválidos";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const siteUrl = publicSiteUrl();
  const notificationUrl = siteUrl.startsWith("https://")
    ? `${siteUrl}/api/mercadopago/webhook`
    : undefined;

  try {
    const payment = await mercadoPagoPayment().create({
      body: {
        token: card.token,
        issuer_id: card.issuer_id != null ? Number(card.issuer_id) : undefined,
        payment_method_id: card.payment_method_id,
        installments: card.installments ?? 1,
        transaction_amount: venta.total,
        description: `OneClick pedido #${venta.id_venta}`,
        statement_descriptor: "ONECLICK",
        external_reference: String(venta.id_venta),
        metadata: { id_venta: venta.id_venta },
        notification_url: notificationUrl,
        payer: {
          email: card.payer?.email || venta.mail,
          first_name: venta.nombre,
          last_name: venta.apellido,
          identification: card.payer?.identification,
        },
      },
      requestOptions: {
        // Evita cobros duplicados si el cliente reintenta el mismo pago
        idempotencyKey: `venta-${venta.id_venta}-${card.token}`,
      },
    });

    const result = await applyMercadoPagoPayment(payment);
    await clearCartCookie();
    await rotateCheckoutIdempotencyKey();

    const mp =
      result === "approved"
        ? "success"
        : result === "rejected"
          ? "failure"
          : "pending";
    return NextResponse.json({
      ok: true,
      status: result,
      redirect: confirmationPath(venta.id_venta, venta.access_token, mp),
    });
  } catch (error) {
    // El pago no se concretó: cancelar la venta pendiente y liberar el cupón
    const raw =
      error instanceof Error ? error.message : "error desconocido al pagar";
    await prisma.venta
      .update({
        where: { id_venta: venta.id_venta },
        data: {
          estado: "cancelada",
          odoo_sync_error: `MP exception: ${raw}`.slice(0, 2000),
        },
      })
      .catch(() => undefined);
    await prisma.pago
      .updateMany({
        where: {
          id_venta: venta.id_venta,
          tipo_pago: { in: ["mercado_pago", "tarjeta"] },
          estado: { not: "aprobado" },
        },
        data: { estado: "rechazado" },
      })
      .catch(() => undefined);
    await releaseCuponForVenta(venta.id_venta).catch(() => undefined);
    console.error("[mercadopago/pay]", error);
    return NextResponse.json({ error: publicPayError(error) }, { status: 402 });
  }
}
