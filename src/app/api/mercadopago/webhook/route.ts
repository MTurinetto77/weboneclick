import { NextRequest, NextResponse } from "next/server";
import {
  mercadoPagoMerchantOrder,
  mercadoPagoPayment,
  verifyMercadoPagoWebhookSignature,
} from "@/lib/mercadopago";
import { applyMercadoPagoPayment } from "@/lib/mp-payment-sync";
import { rateLimit, rateLimitClientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

type NotificationKind = "payment" | "merchant_order" | "unknown";

function paymentId(req: NextRequest, body: unknown): string | null {
  const dataId =
    body && typeof body === "object" && "data" in body
      ? (body as { data?: { id?: string | number } }).data?.id
      : undefined;
  return (
    String(
      dataId ||
        req.nextUrl.searchParams.get("data.id") ||
        req.nextUrl.searchParams.get("id") ||
        "",
    ).trim() || null
  );
}

function notificationKind(
  req: NextRequest,
  body: unknown,
): NotificationKind {
  const fromQuery = (
    req.nextUrl.searchParams.get("topic") ||
    req.nextUrl.searchParams.get("type") ||
    ""
  ).toLowerCase();
  const fromBody =
    body && typeof body === "object"
      ? String(
          (body as { type?: string; topic?: string }).type ||
            (body as { topic?: string }).topic ||
            "",
        ).toLowerCase()
      : "";
  const action =
    body && typeof body === "object"
      ? String((body as { action?: string }).action || "").toLowerCase()
      : "";
  const raw = `${fromQuery} ${fromBody} ${action}`;
  if (raw.includes("merchant_order")) return "merchant_order";
  if (raw.includes("payment")) return "payment";
  return "unknown";
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "unknown error";
  }
}

function isNotFoundError(error: unknown): boolean {
  return /not found|404|Resource not found/i.test(errorMessage(error));
}

/** Errores de negocio / permanentes: no tiene sentido que MP reintente. */
function isNonRetryable(message: string): boolean {
  return /Monto inválido|Stock insuficiente|sin almacén|not found|404|Resource not found|invalid.?payment|no está configurado|Unique constraint|P2002/i.test(
    message,
  );
}

async function applyPaymentById(id: string) {
  const payment = await mercadoPagoPayment().get({ id });
  return applyMercadoPagoPayment(payment);
}

/**
 * Checkout Pro suele notificar `merchant_order` (no payment id).
 * Resolvemos los payments asociados y aplicamos cada uno.
 */
async function applyMerchantOrderById(id: string) {
  const order = await mercadoPagoMerchantOrder().get({
    merchantOrderId: id,
  });
  const paymentIds = [
    ...new Set(
      (order.payments ?? [])
        .map((p) => String(p.id ?? "").trim())
        .filter(Boolean),
    ),
  ];
  if (paymentIds.length === 0) {
    return { ok: true as const, payments: 0 };
  }

  for (const paymentIdValue of paymentIds) {
    await applyPaymentById(paymentIdValue);
  }
  return { ok: true as const, payments: paymentIds.length };
}

/**
 * Si el topic no viene claro, probamos payment y, ante 404, merchant_order.
 * Cubre IPNs viejos y webhooks mal tipados (caso venta 233).
 */
async function applyUnknownResource(id: string) {
  try {
    await applyPaymentById(id);
    return;
  } catch (error) {
    if (!isNotFoundError(error)) throw error;
  }
  await applyMerchantOrderById(id);
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(rateLimitClientKey(req, "mp-webhook"), {
    limit: 60,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    // Algunas notificaciones antiguas llegan solo por query string.
  }

  const id = paymentId(req, body);
  const kind = notificationKind(req, body);

  const signature = verifyMercadoPagoWebhookSignature({
    xSignature: req.headers.get("x-signature"),
    xRequestId: req.headers.get("x-request-id"),
    // MP firma con data.id de query; fallback al id del body.
    dataId:
      req.nextUrl.searchParams.get("data.id") ||
      req.nextUrl.searchParams.get("id") ||
      id,
  });
  if (!signature.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!id) return NextResponse.json({ ok: true });

  try {
    if (kind === "merchant_order") {
      await applyMerchantOrderById(id);
    } else if (kind === "payment") {
      await applyPaymentById(id);
    } else {
      await applyUnknownResource(id);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = errorMessage(error);
    console.error("[mercadopago/webhook] failed:", { id, kind, message, error });

    // ACK para errores permanentes (evita reintentos infinitos de MP).
    if (isNonRetryable(message)) {
      return NextResponse.json({ ok: true, ignored: true, reason: message });
    }

    // Transitorio (timeout, red, 5xx de MP): pedimos reintento.
    return NextResponse.json(
      { error: "Webhook processing failed", detail: message },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
