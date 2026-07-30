import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { runProductosSync } from "@/lib/odoo-sync";

/**
 * Cron: sincroniza catálogo maestro + productos publicados web + precios + desactivaciones.
 * Auth: Authorization: Bearer $CRON_SECRET
 * Uso: diario/semanal (precios y altas/bajas). Sin imágenes ni stock.
 */
export async function POST(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const dryRun = new URL(req.url).searchParams.get("dryRun") === "1";
  const stats = await runProductosSync({ dryRun });
  return NextResponse.json(stats);
}
