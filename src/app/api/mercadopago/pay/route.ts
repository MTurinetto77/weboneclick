import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { clearCartCookie } from "@/lib/cart";
import { createPendingVenta } from "@/lib/checkout-venta";
import { mercadoPagoPayment, publicSiteUrl } from "@/lib/mercadopago";
import { applyMercadoPagoPayment } from "@/lib/mp-payment-sync";
import { prisma } from "@/lib/prisma";

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

/** Pago con tarjeta embebido (Card Payment Brick) sin salir del sitio. */
export async function POST(req: NextRequest) {
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
      { status: 400 }
    );
  }

  const session = await auth();

  let venta;
  try {
    venta = await createPendingVenta(
      fields,
      "tarjeta",
      session?.user?.email ?? null,
      session?.user?.id ?? null
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

    const mp =
      result === "approved" ? "success" : result === "rejected" ? "failure" : "pending";
    return NextResponse.json({
      ok: true,
      status: result,
      redirect: `/checkout/confirmacion/${venta.id_venta}?mp=${mp}`,
    });
  } catch (error) {
    // El pago no se concretó: cancelar la venta pendiente recién creada
    await prisma.venta
      .update({ where: { id_venta: venta.id_venta }, data: { estado: "cancelada" } })
      .catch(() => undefined);
    const message =
      error instanceof Error ? error.message : "No pudimos procesar el pago";
    return NextResponse.json({ error: message }, { status: 402 });
  }
}
