import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await requireAdmin();

  const cats = await prisma.categoria.findMany({
    orderBy: { nombre: "asc" },
    select: {
      id_categoria: true,
      nombre: true,
      slug: true,
    },
  });

  return NextResponse.json(cats);
}
