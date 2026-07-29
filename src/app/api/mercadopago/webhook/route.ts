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

  // Consultar el pago en Mercado Pago evita confiar en el contenido del webhook.
  const payment = await mercadoPagoPayment().get({ id });

  try {
    await applyMercadoPagoPayment(payment);
  } catch (error) {
    console.error("[mercadopago/webhook] apply failed:", error);
    return NextResponse.json({ error: "Conflict" }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
