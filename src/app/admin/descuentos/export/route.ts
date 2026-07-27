import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sp(v: string | null): string {
  return (v || "").trim();
}

/** Exporta cupones a Excel filtrando por grupo / estado / código. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const grupo = sp(searchParams.get("grupo"));
  const estado = sp(searchParams.get("estado"));
  const q = sp(searchParams.get("q")).toUpperCase();

  const where = {
    ...(grupo ? { grupo } : {}),
    ...(estado === "emitido" || estado === "consumido" ? { estado } : {}),
    ...(q ? { codigo: { contains: q } } : {}),
  };

  const rows = await prisma.cupones_descuento.findMany({
    where,
    orderBy: [{ grupo: "asc" }, { fecha_creacion: "desc" }, { id_cupon: "desc" }],
    include: {
      usuario_creacion: { select: { mail: true } },
    },
  });

  const header = [
    "Código",
    "Monto",
    "Vigencia",
    "Estado",
    "Grupo",
    "Fecha creación",
    "Usuario creación",
    "Fecha consumido",
    "ID venta",
  ];

  const data = rows.map((r) => [
    r.codigo,
    Number(r.monto),
    r.fecha_vigencia.toISOString().slice(0, 10),
    r.estado,
    r.grupo ?? "",
    r.fecha_creacion.toISOString(),
    r.usuario_creacion.mail,
    r.fecha_consumido ? r.fecha_consumido.toISOString() : "",
    r.id_venta ?? "",
  ]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
  XLSX.utils.book_append_sheet(wb, ws, "Cupones");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  const slug = grupo
    ? grupo.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 40)
    : "todos";
  const filename = `cupones_${slug}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
