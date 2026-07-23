import { NextRequest, NextResponse } from "next/server";
import { resolveCostoEnvio } from "@/lib/envio-costo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/checkout/codigo-postal?cp=1001&subtotal=150000 */
export async function GET(req: NextRequest) {
  const cp = req.nextUrl.searchParams.get("cp") || "";
  const subtotal = Number(req.nextUrl.searchParams.get("subtotal") || 0);

  const result = await resolveCostoEnvio({
    codigo_postal: cp,
    subtotal: Number.isFinite(subtotal) ? subtotal : 0,
  });

  return NextResponse.json({
    ok: result.ok,
    codigo_postal: result.codigo_postal,
    costo: result.costo,
    gratis: result.gratis,
    message: result.message,
    localidad: result.match?.localidad ?? null,
    proveedor: result.match?.proveedor ?? null,
    dias_entrega: result.match?.dias_entrega ?? null,
  });
}
