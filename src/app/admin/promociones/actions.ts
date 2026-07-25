"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { deleteUploadedFile, saveUploadedFile } from "@/lib/uploads";
import { slugify } from "@/lib/slug";

async function guard() {
  await requireAdmin();
}

function isImagePath(value: string | null | undefined) {
  if (!value) return false;
  return value.includes("/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(value);
}

function revalidatePromo(slug?: string | null) {
  revalidatePath("/admin/promociones");
  revalidatePath("/");
  if (slug) revalidatePath(`/${slug}`);
}

async function uniquePromoSlug(base: string, excludeId?: number) {
  let slug = slugify(base) || `promo-${Date.now()}`;
  let i = 2;
  while (true) {
    const existing = await prisma.promocion.findUnique({ where: { slug } });
    if (!existing || existing.id_promocion === excludeId) return slug;
    slug = `${slugify(base) || "promo"}-${i++}`;
  }
}

export async function createPromocion(formData: FormData) {
  await guard();
  const nombre = String(formData.get("nombre") || "").trim();
  if (!nombre) throw new Error("Nombre requerido");

  const subtitulo = String(formData.get("subtitulo") || "").trim() || null;
  const iconoText = String(formData.get("icono") || "").trim() || null;
  const prioridad = Number(formData.get("prioridad") || 0);
  const slugInput = String(formData.get("slug") || "").trim();
  const slug = await uniquePromoSlug(slugInput || nombre);

  let icono = iconoText;
  const iconFile = formData.get("icono_imagen");
  if (iconFile instanceof File && iconFile.size > 0) {
    icono = await saveUploadedFile(iconFile, "promos");
  }

  let etiqueta_imagen: string | null = null;
  const etiquetaFile = formData.get("etiqueta_imagen");
  if (etiquetaFile instanceof File && etiquetaFile.size > 0) {
    etiqueta_imagen = await saveUploadedFile(etiquetaFile, "promos");
  }

  const promo = await prisma.promocion.create({
    data: {
      nombre,
      subtitulo,
      icono,
      etiqueta_imagen,
      prioridad: Number.isFinite(prioridad) ? prioridad : 0,
      slug,
      activo: true,
    },
  });

  revalidatePromo(promo.slug);
  redirect(`/admin/promociones/${promo.id_promocion}`);
}

export async function updatePromocion(id_promocion: number, formData: FormData) {
  await guard();
  const existing = await prisma.promocion.findUnique({ where: { id_promocion } });
  if (!existing) throw new Error("Promoción no encontrada");

  const nombre = String(formData.get("nombre") || "").trim();
  if (!nombre) throw new Error("Nombre requerido");

  const subtitulo = String(formData.get("subtitulo") || "").trim() || null;
  const iconoText = String(formData.get("icono") || "").trim() || null;
  const prioridad = Number(formData.get("prioridad") || 0);
  const slugInput = String(formData.get("slug") || "").trim();
  const slug = await uniquePromoSlug(slugInput || nombre, id_promocion);
  const activo = formData.get("activo") === "on";
  const quitarEtiqueta = formData.get("quitar_etiqueta") === "on";
  const quitarIconoImg = formData.get("quitar_icono_img") === "on";

  let icono = existing.icono;
  const iconFile = formData.get("icono_imagen");
  if (iconFile instanceof File && iconFile.size > 0) {
    icono = await saveUploadedFile(iconFile, "promos");
    if (existing.icono && existing.icono.includes("/")) {
      await deleteUploadedFile(existing.icono).catch(() => undefined);
    }
  } else if (quitarIconoImg && existing.icono && existing.icono.includes("/")) {
    await deleteUploadedFile(existing.icono).catch(() => undefined);
    icono = iconoText;
  } else if (!isImagePath(existing.icono)) {
    // Solo sobrescribir si el icono actual es texto/emoji (no una imagen subida)
    icono = iconoText;
  }

  let etiqueta_imagen = existing.etiqueta_imagen;
  const etiquetaFile = formData.get("etiqueta_imagen");
  if (etiquetaFile instanceof File && etiquetaFile.size > 0) {
    etiqueta_imagen = await saveUploadedFile(etiquetaFile, "promos");
    if (existing.etiqueta_imagen) {
      await deleteUploadedFile(existing.etiqueta_imagen).catch(() => undefined);
    }
  } else if (quitarEtiqueta) {
    if (existing.etiqueta_imagen) {
      await deleteUploadedFile(existing.etiqueta_imagen).catch(() => undefined);
    }
    etiqueta_imagen = null;
  }

  const categoriaIds = formData
    .getAll("categorias")
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0);

  await prisma.$transaction([
    prisma.promocion_categoria.deleteMany({ where: { id_promocion } }),
    prisma.promocion.update({
      where: { id_promocion },
      data: {
        nombre,
        subtitulo,
        icono,
        etiqueta_imagen,
        prioridad: Number.isFinite(prioridad) ? prioridad : 0,
        slug,
        activo,
        categorias: {
          create: categoriaIds.map((id_categoria) => ({ id_categoria })),
        },
      },
    }),
  ]);

  revalidatePromo(existing.slug);
  if (slug !== existing.slug) revalidatePromo(slug);
  revalidatePath(`/admin/promociones/${id_promocion}`);
}

export async function deletePromocion(id_promocion: number) {
  await guard();
  const existing = await prisma.promocion.findUnique({ where: { id_promocion } });
  if (!existing) throw new Error("Promoción no encontrada");

  if (existing.etiqueta_imagen) {
    await deleteUploadedFile(existing.etiqueta_imagen).catch(() => undefined);
  }
  if (existing.icono && existing.icono.includes("/")) {
    await deleteUploadedFile(existing.icono).catch(() => undefined);
  }

  await prisma.promocion.delete({ where: { id_promocion } });
  revalidatePromo(existing.slug);
  redirect("/admin/promociones");
}

export async function addPromocionProducto(id_promocion: number, formData: FormData) {
  await guard();
  const id_producto = Number(formData.get("id_producto"));
  if (!Number.isFinite(id_producto) || id_producto <= 0) {
    throw new Error("Producto inválido");
  }

  const promo = await prisma.promocion.findUnique({ where: { id_promocion } });
  if (!promo) throw new Error("Promoción no encontrada");

  await prisma.promocion_producto.upsert({
    where: {
      id_promocion_id_producto: { id_promocion, id_producto },
    },
    create: { id_promocion, id_producto },
    update: {},
  });

  revalidatePromo(promo.slug);
  revalidatePath(`/admin/promociones/${id_promocion}`);
}

export async function removePromocionProducto(id_promocion: number, id_producto: number) {
  await guard();
  const promo = await prisma.promocion.findUnique({ where: { id_promocion } });
  await prisma.promocion_producto.deleteMany({ where: { id_promocion, id_producto } });
  revalidatePromo(promo?.slug);
  revalidatePath(`/admin/promociones/${id_promocion}`);
}
