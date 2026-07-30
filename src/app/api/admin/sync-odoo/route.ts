import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth-guard";
import { runSyncBatch, type SyncType } from "@/lib/odoo-sync";

const SYNC_TYPES = new Set<SyncType>(["productos", "imagenes", "stock"]);

/**
 * Sync Odoo por lotes (panel admin).
 * Body: { type: "productos" | "imagenes" | "stock", offset?: number, dryRun?: boolean }
 */
export async function POST(req: Request) {
  const session = await requireAdminApi();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    type?: string;
    offset?: number;
    dryRun?: boolean;
  };

  const type = body.type as SyncType | undefined;
  if (!type || !SYNC_TYPES.has(type)) {
    return NextResponse.json(
      { error: 'type debe ser "productos", "imagenes" o "stock"' },
      { status: 400 }
    );
  }

  const offset = typeof body.offset === "number" && body.offset >= 0 ? body.offset : 0;
  const result = await runSyncBatch({
    type,
    offset,
    dryRun: body.dryRun ?? false,
  });

  return NextResponse.json(result);
}
