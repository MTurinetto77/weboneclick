import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth-guard";
import { isCronAuthorized } from "@/lib/cron-auth";
import { syncVentaToOdoo } from "@/lib/odoo-venta";

export const runtime = "nodejs";

/** POST /api/admin/odoo/sync-venta { id_venta: number } */
export async function POST(req: Request) {
  const session = await requireAdminApi();
  if (!session && !isCronAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { id_venta?: number };
  const id_venta = Number(body.id_venta);
  if (!Number.isInteger(id_venta) || id_venta <= 0) {
    return NextResponse.json({ error: "id_venta inválido" }, { status: 400 });
  }

  const result = await syncVentaToOdoo(id_venta);
  return NextResponse.json({ result });
}
