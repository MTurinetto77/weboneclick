"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { deleteUploadedFile, saveUploadedFile } from "@/lib/uploads";

async function guard() {
  await requireAdmin();
}

function revalidateFiscal() {
  revalidatePath("/admin/constancias");
  revalidatePath("/fiscal");
}

export async function createConstancia(formData: FormData) {
  await guard();
  const titulo = String(formData.get("titulo") || "").trim();
  const categoria = String(formData.get("categoria") || "impositiva").trim();
  const url_externa = String(formData.get("url_externa") || "").trim() || null;
  const orden = Number(formData.get("orden") || 0);
  const file = formData.get("archivo");

  let archivo: string | null = null;
  if (file instanceof File && file.size > 0) {
    archivo = await saveUploadedFile(file, "fiscal");
  }

  if (!titulo) throw new Error("Título requerido");

  await prisma.constancia_fiscal.create({
    data: {
      titulo,
      categoria,
      archivo,
      url_externa,
      orden: Number.isFinite(orden) ? orden : 0,
      activo: true,
    },
  });
  revalidateFiscal();
}

export async function updateConstancia(id_constancia: number, formData: FormData) {
  await guard();
  const existing = await prisma.constancia_fiscal.findUnique({ where: { id_constancia } });
  if (!existing) throw new Error("Constancia no encontrada");

  const titulo = String(formData.get("titulo") || "").trim();
  const categoria = String(formData.get("categoria") || existing.categoria).trim();
  const url_externa = String(formData.get("url_externa") || "").trim() || null;
  const orden = Number(formData.get("orden") || existing.orden);
  const activoRaw = formData.getAll("activo");
  const activo = activoRaw.map(String).includes("1");
  const file = formData.get("archivo");

  let archivo = existing.archivo;
  if (file instanceof File && file.size > 0) {
    archivo = await saveUploadedFile(file, "fiscal");
    if (existing.archivo) await deleteUploadedFile(existing.archivo);
  }

  await prisma.constancia_fiscal.update({
    where: { id_constancia },
    data: {
      titulo,
      categoria,
      url_externa,
      archivo,
      orden: Number.isFinite(orden) ? orden : 0,
      activo,
    },
  });
  revalidateFiscal();
}

export async function deleteConstancia(id_constancia: number) {
  await guard();
  const existing = await prisma.constancia_fiscal.findUnique({ where: { id_constancia } });
  if (!existing) return;
  await prisma.constancia_fiscal.delete({ where: { id_constancia } });
  if (existing.archivo) await deleteUploadedFile(existing.archivo);
  revalidateFiscal();
}
