import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { cartMaxInstallments, clearCartCookie, resolveCart } from "@/lib/cart";
import { rotateCheckoutIdempotencyKey } from "@/lib/checkout-idempotency";
import {
  confirmationPath,
  createPendingVenta,
  type TipoPagoCheckout,
} from "@/lib/checkout-venta";
import { releaseCuponForVenta } from "@/lib/cupones";
import { mercadoPagoPayment, publicSiteUrl } from "@/lib/mercadopago";
import {
  buildPaymentAdditionalInfo,
  buildPaymentPayer,
  clientIpFromHeaders,
  toMpPayerSource,
} from "@/lib/mp-payer-payload";
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
  /** Device ID de security.js (MP_DEVICE_SESSION_ID). */
  deviceSessionId?: string | null;
};

function publicPayError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (
    message &&
    !/mercadopago|access.?token|api|internal|ECONN|timeout/i.test(message)
  ) {
    return message;
  }
  return "No pudimos procesar el pago";
}

function resolveTipoPago(fields: Record<string, string>): TipoPagoCheckout {
  const raw = String(fields.tipo_pago || "").trim();
  if (raw === "tarjeta") return "tarjeta";
  return "mercado_pago";
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

  const tipo_pago = resolveTipoPago(fields);
  const installments = card.installments ?? 1;

  if (tipo_pago === "mercado_pago" && installments !== 1) {
    return NextResponse.json(
      {
        error:
          "El pago contado solo admite 1 cuota. Elegí cuotas o 1 pago.",
      },
      { status: 400 },
    );
  }

  if (tipo_pago === "tarjeta") {
    const cart = await resolveCart();
    const maxInstallments = cartMaxInstallments(cart.items);
    if (installments < 1 || installments > maxInstallments) {
      return NextResponse.json(
        {
          error: `Las cuotas deben estar entre 1 y ${maxInstallments} para este carrito.`,
        },
        { status: 400 },
      );
    }
  }

  const session = await auth();

  let venta;
  try {
    venta = await createPendingVenta(
      fields,
      tipo_pago,
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

  const src = toMpPayerSource(venta);
  const ipAddress = clientIpFromHeaders(req.headers);
  const deviceSessionId = body.deviceSessionId?.trim() || undefined;

  try {
    const payment = await mercadoPagoPayment().create({
      body: {
        token: card.token,
        issuer_id: card.issuer_id != null ? Number(card.issuer_id) : undefined,
        payment_method_id: card.payment_method_id,
        installments,
        transaction_amount: venta.total,
        description: `OneClick pedido #${venta.id_venta}`,
        statement_descriptor: "ONECLICK",
        external_reference: String(venta.id_venta),
        metadata: { id_venta: venta.id_venta },
        notification_url: notificationUrl,
        payer: buildPaymentPayer(src, card.payer),
        additional_info: buildPaymentAdditionalInfo(src, ipAddress),
      },
      requestOptions: {
        idempotencyKey: `venta-${venta.id_venta}-${card.token}`,
        ...(deviceSessionId ? { meliSessionId: deviceSessionId } : {}),
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
