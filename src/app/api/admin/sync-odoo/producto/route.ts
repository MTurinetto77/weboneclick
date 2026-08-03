import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth-guard";
import { syncProductoBySku } from "@/lib/odoo-sync";

/**
 * Sync puntual de un producto por SKU (datos, stock e imágenes).
 * Body: { sku: string, dryRun?: boolean }
 */
export async function POST(req: Request) {
  const session = await requireAdminApi();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    sku?: string;
    dryRun?: boolean;
  };

  const sku = typeof body.sku === "string" ? body.sku.trim() : "";
  if (!sku) {
    return NextResponse.json({ error: "sku es requerido" }, { status: 400 });
  }

  try {
    const result = await syncProductoBySku(sku, { dryRun: body.dryRun ?? false });
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const odooDown =
      /Odoo HTTP 405|Odoo HTTP 503|fetch failed|ECONNREFUSED|ETIMEDOUT/i.test(message);
    return NextResponse.json(
      {
        ok: false,
        sku,
        message: odooDown
          ? "Odoo no responde (instancia caída o URL incorrecta). Revisá ODOO_URL en .env."
          : `Error al sincronizar: ${message}`,
        errors: [message],
        stats: {
          categorias: { created: 0, updated: 0 },
          almacenes: { created: 0, updated: 0 },
          marcas: { created: 0, updated: 0 },
          etiquetas: { created: 0, updated: 0 },
          productos: { created: 0, updated: 0, deactivated: 0, images: 0 },
          precios: { inserted: 0 },
          stock: { upserted: 0 },
          errors: [message],
          dryRun: false,
        },
      },
      { status: 502 }
    );
  }
}
