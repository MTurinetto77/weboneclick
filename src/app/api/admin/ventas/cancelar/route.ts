import { NextResponse } from "next/server";
import { requireVentasApi } from "@/lib/auth-guard";
import { releaseCuponForVenta } from "@/lib/cupones";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** POST /api/admin/ventas/cancelar { id_venta: number } */
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

  const venta = await prisma.venta.findUnique({
    where: { id_venta },
    select: { id_venta: true, estado: true },
  });
  if (!venta) {
    return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });
  }
  if (venta.estado === "pagada") {
    return NextResponse.json(
      { error: "No se puede cancelar una venta pagada" },
      { status: 400 },
    );
  }
  if (venta.estado === "cancelada") {
    return NextResponse.json({ result: "ok", message: "Ya estaba cancelada" });
  }

  await prisma.$transaction(async (tx) => {
    await tx.venta.update({
      where: { id_venta },
      data: {
        estado: "cancelada",
        odoo_sync_error: "Cancelada manualmente desde admin",
      },
    });
    await tx.pago.updateMany({
      where: {
        id_venta,
        estado: { not: "aprobado" },
      },
      data: { estado: "rechazado" },
    });
    await tx.envio.updateMany({
      where: { id_venta, estado: { not: "cancelado" } },
      data: { estado: "cancelado" },
    });
  });

  await releaseCuponForVenta(id_venta).catch(() => undefined);

  return NextResponse.json({
    result: "ok",
    message: "Venta cancelada",
  });
}
