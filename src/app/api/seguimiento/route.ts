import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitClientKey } from "@/lib/rate-limit";
import {
  consultarSeguimiento,
  parseTipoEnvio,
} from "@/lib/seguimiento/seguimiento";
import { SeguimientoError } from "@/lib/seguimiento/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  numero_pedido?: string;
  tipo_envio?: string;
};

/** POST /api/seguimiento — consulta tracking en FastTrack / SmartPost (ePresis). */
export async function POST(req: NextRequest) {
  const limited = rateLimit(rateLimitClientKey(req, "seguimiento"), {
    limit: 30,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: "Demasiadas consultas. Probá de nuevo en un momento.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Solicitud inválida." },
      { status: 400 },
    );
  }

  try {
    const data = await consultarSeguimiento({
      numeroPedido: body.numero_pedido || "",
      tipoEnvio: parseTipoEnvio(body.tipo_envio),
    });
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    if (err instanceof SeguimientoError) {
      return NextResponse.json(
        { ok: false, message: err.message, code: err.code },
        { status: err.status },
      );
    }
    console.error("[seguimiento]", err);
    return NextResponse.json(
      {
        ok: false,
        message: "No pudimos consultar el estado del envío. Intentá más tarde.",
      },
      { status: 500 },
    );
  }
}
