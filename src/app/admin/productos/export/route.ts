import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { pickCurrentPriceInfo, precioEfectivo } from "@/lib/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sp(v: string | null): string {
  return (v || "").trim();
}

function csvCell(value: string | number | boolean | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Exporta productos a CSV (sin descripción), con precio vigente. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const q = sp(req.nextUrl.searchParams.get("q"));

  const where = q
    ? {
        OR: [
          { titulo: { contains: q } },
          { descripcion: { contains: q } },
          { sku: { contains: q } },
        ],
      }
    : undefined;

  const rows = await prisma.producto.findMany({
    where,
    include: { precios: true },
    orderBy: { id_producto: "desc" },
  });

  const header = [
    "ID",
    "SKU",
    "Título",
    "Slug",
    "Precio",
    "Precio con descuento",
    "% Descuento",
    "Precio efectivo",
    "Activo",
    "Odoo ID",
    "Cuotas máx",
  ];

  const lines = [
    header.map(csvCell).join(","),
    ...rows.map((p) => {
      const info = pickCurrentPriceInfo(p.precios);
      const efectivo = precioEfectivo(info.precio, info.precio_con_desc);
      return [
        p.id_producto,
        p.sku ?? "",
        p.titulo,
        p.slug,
        info.precio ?? "",
        info.precio_con_desc ?? "",
        info.porcentaje_desc ?? "",
        efectivo ?? "",
        p.activo ? "Sí" : "No",
        p.odoo_id ?? "",
        p.cuotas_max ?? "",
      ]
        .map(csvCell)
        .join(",");
    }),
  ];

  // BOM para que Excel abra UTF-8 correctamente
  const body = `\uFEFF${lines.join("\r\n")}`;
  const filename = `productos_${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
