"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

function revalidate() {
  revalidatePath("/admin/exclusiones");
  revalidatePath("/fiscal");
}

/** Input date YYYY-MM-DD → Date UTC, o null si vacío. */
function parseDate(raw: FormDataEntryValue | null): Date | null {
  const s = String(raw || "").trim();
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

export async function createExclusion(formData: FormData) {
  await requireAdmin();
  const impuesto = String(formData.get("impuesto") || "").trim();
  const vigencia_desde = parseDate(formData.get("vigencia_desde"));
  const vigencia_hasta = parseDate(formData.get("vigencia_hasta"));
  const orden = Number(formData.get("orden") || 0);
  if (!impuesto || !vigencia_desde) throw new Error("Impuesto y fecha desde son requeridos");

  await prisma.exclusion_fiscal.create({
    data: {
      impuesto,
      vigencia_desde,
      vigencia_hasta,
      orden: Number.isFinite(orden) ? orden : 0,
      activo: true,
    },
  });
  revalidate();
}

export async function updateExclusion(id_exclusion: number, formData: FormData) {
  await requireAdmin();
  const existing = await prisma.exclusion_fiscal.findUnique({ where: { id_exclusion } });
  if (!existing) throw new Error("Exclusión no encontrada");

  const impuesto = String(formData.get("impuesto") || "").trim();
  const vigencia_desde = parseDate(formData.get("vigencia_desde")) || existing.vigencia_desde;
  const vigencia_hasta = parseDate(formData.get("vigencia_hasta"));
  const orden = Number(formData.get("orden") || existing.orden);
  const activo = formData.getAll("activo").map(String).includes("1");

  await prisma.exclusion_fiscal.update({
    where: { id_exclusion },
    data: {
      impuesto: impuesto || existing.impuesto,
      vigencia_desde,
      vigencia_hasta,
      orden: Number.isFinite(orden) ? orden : 0,
      activo,
    },
  });
  revalidate();
}

export async function deleteExclusion(id_exclusion: number) {
  await requireAdmin();
  await prisma.exclusion_fiscal.delete({ where: { id_exclusion } }).catch(() => null);
  revalidate();
}
