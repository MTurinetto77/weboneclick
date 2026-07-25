"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

async function guard() {
  await requireAdmin();
}

export async function createTienda(formData: FormData) {
  await guard();
  const nombre = String(formData.get("nombre") || "").trim();
  const slug = slugify(String(formData.get("slug") || nombre));
  const ordenRaw = Number(formData.get("orden") || 0);
  await prisma.tienda.create({
    data: {
      nombre,
      slug,
      direccion: String(formData.get("direccion") || "").trim(),
      direccion_corta: String(formData.get("direccion_corta") || "").trim() || null,
      localidad: String(formData.get("localidad") || "").trim(),
      provincia: String(formData.get("provincia") || "").trim(),
      codigo_postal: String(formData.get("codigo_postal") || "").trim() || null,
      email: String(formData.get("email") || "").trim() || null,
      telefono: String(formData.get("telefono") || "").trim() || null,
      horarios: String(formData.get("horarios") || "").trim() || null,
      orden: Number.isFinite(ordenRaw) ? ordenRaw : 0,
      activo: true,
    },
  });
  revalidatePath("/admin/tiendas");
  revalidatePath("/tiendas");
  revalidatePath("/contacto");
}

export async function deleteTienda(id_tienda: number) {
  await guard();
  await prisma.tienda.delete({ where: { id_tienda } });
  revalidatePath("/admin/tiendas");
  revalidatePath("/tiendas");
  revalidatePath("/contacto");
}

export async function createBeneficio(formData: FormData) {
  await guard();
  const nombre = String(formData.get("nombre") || "").trim();
  const slug = slugify(String(formData.get("slug") || nombre));
  const cuotasRaw = String(formData.get("cuotas") || "");
  await prisma.beneficio.create({
    data: {
      nombre,
      slug,
      descripcion: String(formData.get("descripcion") || "").trim() || null,
      cuotas: cuotasRaw ? Number(cuotasRaw) : null,
      activo: true,
    },
  });
  revalidatePath("/admin/beneficios");
  revalidatePath("/ocbeneficios");
}

export async function deleteBeneficio(id_beneficio: number) {
  await guard();
  await prisma.beneficio.delete({ where: { id_beneficio } });
  revalidatePath("/admin/beneficios");
  revalidatePath("/ocbeneficios");
}
