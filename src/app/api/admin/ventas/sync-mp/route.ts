import { NextResponse } from "next/server";
import { requireVentasApi } from "@/lib/auth-guard";
import { syncVentaFromMercadoPago } from "@/lib/mp-payment-sync";

export const runtime = "nodejs";

/** POST /api/admin/ventas/sync-mp { id_venta: number } */
export async function POST(req: Request) {
  const session = await requireVentasApi();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { id_venta?: number };
  const id_venta = Number(body.id_venta);
  if (!Number.isInteger(id_venta) || id_venta <= 0) {
    return NextResponse.json({ error: "id_venta inválido" }, { status: 400 });
  }

  try {
    const result = await syncVentaFromMercadoPago(id_venta);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al consultar Mercado Pago";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
