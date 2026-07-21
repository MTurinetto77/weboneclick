import { NextRequest, NextResponse } from "next/server";
import { mercadoPagoPayment } from "@/lib/mercadopago";
import { applyMercadoPagoPayment } from "@/lib/mp-payment-sync";

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
        ""
    ).trim() || null
  );
}

export async function POST(req: NextRequest) {
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    // Algunas notificaciones antiguas llegan solo por query string.
  }

  const id = paymentId(req, body);
  if (!id) return NextResponse.json({ ok: true });

  // Consultar el pago en Mercado Pago evita confiar en el contenido del webhook.
  const payment = await mercadoPagoPayment().get({ id });

  try {
    await applyMercadoPagoPayment(payment);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
