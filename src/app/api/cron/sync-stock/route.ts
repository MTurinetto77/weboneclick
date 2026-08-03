import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { runStockSync } from "@/lib/odoo-sync";

/**
 * Cron: sincroniza stock por almacén vendible desde Odoo.
 * Auth: Authorization: Bearer $CRON_SECRET
 *
 * Recomendado: cada 1 minuto desde la VPS de cron.
 * Anti-solapamiento: si ya corre un sync, responde 200 con `{ skipped: true }`.
 */
export async function POST(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const dryRun = new URL(req.url).searchParams.get("dryRun") === "1";
  const stats = await runStockSync({ dryRun });
  return NextResponse.json(stats);
}
