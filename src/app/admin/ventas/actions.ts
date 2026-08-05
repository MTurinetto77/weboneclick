"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireVentasAccess } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function updateVentaContacto(id_venta: number, formData: FormData) {
  await requireVentasAccess();

  if (!Number.isFinite(id_venta) || id_venta <= 0) {
    throw new Error("Venta inválida");
  }

  const contactado = formData.get("contactado") === "on";
  const comentario = String(formData.get("comentario") || "").trim() || null;

  await prisma.venta.update({
    where: { id_venta },
    data: { contactado, comentario },
  });

  revalidatePath("/admin/ventas");
  revalidatePath(`/admin/ventas/${id_venta}`);
  redirect(`/admin/ventas/${id_venta}?ok=1`);
}
