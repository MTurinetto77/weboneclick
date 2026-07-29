import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth-guard";
import { runFullSync } from "@/lib/odoo-sync";

export async function POST(req: Request) {
  const session = await requireAdminApi();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    skipImages?: boolean;
    skipStock?: boolean;
    dryRun?: boolean;
  };
  const stats = await runFullSync({
    skipImages: body.skipImages ?? true,
    skipStock: body.skipStock ?? true,
    dryRun: body.dryRun ?? false,
  });
  return NextResponse.json(stats);
}
