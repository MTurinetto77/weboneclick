import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { runPreciosPromoSync } from "@/lib/odoo-sync";

/**
 * Cron diario: solo precios de lista + descuentos pricelist “Promociones Vigentes”.
 * Limpia descuento si el producto salió de la lista; reemplaza si cambió.
 * Auth: Authorization: Bearer $CRON_SECRET
 *
 * POST /api/cron/sync-precios-promo
 * POST /api/cron/sync-precios-promo?dryRun=1
 */
export async function POST(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const dryRun = new URL(req.url).searchParams.get("dryRun") === "1";
  const stats = await runPreciosPromoSync({ dryRun });
  return NextResponse.json(stats);
}
