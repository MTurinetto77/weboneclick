import { NextRequest, NextResponse } from "next/server";
import {
  mercadoPagoPayment,
  verifyMercadoPagoWebhookSignature,
} from "@/lib/mercadopago";
import { applyMercadoPagoPayment } from "@/lib/mp-payment-sync";
import { rateLimit, rateLimitClientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

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

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "unknown error";
  }
}

/** Errores de negocio / permanentes: no tiene sentido que MP reintente. */
function isNonRetryable(message: string): boolean {
  return /Monto inválido|Stock insuficiente|sin almacén|not found|404|Resource not found|invalid.?payment|no está configurado|Unique constraint|P2002/i.test(
    message,
  );
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
    // Consultar el pago en Mercado Pago evita confiar en el contenido del webhook.
    const payment = await mercadoPagoPayment().get({ id });
    await applyMercadoPagoPayment(payment);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = errorMessage(error);
    console.error("[mercadopago/webhook] failed:", { id, message, error });

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
