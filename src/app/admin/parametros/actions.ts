"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { upsertParametro } from "@/lib/parametros";

function revalidate() {
  revalidatePath("/admin/parametros");
  revalidatePath("/admin/envios");
}

export async function upsertParametroAction(formData: FormData) {
  await requireAdmin();
  const nombre = String(formData.get("nombre") || "").trim();
  const tipo = String(formData.get("tipo") || "string").trim() || "string";
  const valor = String(formData.get("valor") ?? "").trim();
  if (!nombre) throw new Error("Nombre de parámetro requerido");

  await upsertParametro({ nombre, tipo, valor });
  revalidate();
}

export async function updateParametroAction(id_parametro: number, formData: FormData) {
  await requireAdmin();
  const tipo = String(formData.get("tipo") || "string").trim() || "string";
  const valor = String(formData.get("valor") ?? "").trim();
  await prisma.parametro.update({
    where: { id_parametro },
    data: { tipo, valor },
  });
  revalidate();
}

export async function deleteParametroAction(id_parametro: number) {
  await requireAdmin();
  await prisma.parametro.delete({ where: { id_parametro } }).catch(() => null);
  revalidate();
}
