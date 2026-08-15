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

/** Extrae SKUs de un CSV: una columna `sku`, o una fila/celda por SKU. */
function parseSkusFromCsv(text: string): string[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const skus: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const cells = lines[i]
      .split(/[,;\t]/)
      .map((c) => c.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
    if (!cells.length) continue;
    // Saltar encabezado
    if (i === 0 && cells.length === 1 && /^sku$/i.test(cells[0])) continue;
    if (i === 0 && cells.length > 1) {
      const skuIdx = cells.findIndex((c) => /^sku$/i.test(c));
      if (skuIdx >= 0) {
        // Header multi-columna: tomar solo la columna sku en el resto
        for (let j = 1; j < lines.length; j++) {
          const row = lines[j]
            .split(/[,;\t]/)
            .map((c) => c.trim().replace(/^["']|["']$/g, ""));
          const v = row[skuIdx]?.trim();
          if (v) skus.push(v);
        }
        return [...new Set(skus)];
      }
    }
    // Una o más celdas por fila = SKUs
    for (const c of cells) skus.push(c);
  }
  return [...new Set(skus)];
}

export async function importPromocionProductosCsv(id_promocion: number, formData: FormData) {
  await guard();
  const promo = await prisma.promocion.findUnique({ where: { id_promocion } });
  if (!promo) throw new Error("Promoción no encontrada");

  const file = formData.get("csv");
  if (!(file instanceof File) || file.size === 0) {
    redirect(`/admin/promociones/${id_promocion}?csv_err=archivo`);
  }

  const text = await file.text();
  const skus = parseSkusFromCsv(text);
  if (!skus.length) {
    redirect(`/admin/promociones/${id_promocion}?csv_err=vacio`);
  }

  const productos = await prisma.producto.findMany({
    where: { sku: { in: skus } },
    select: { id_producto: true, sku: true },
  });

  const bySku = new Map(
    productos
      .filter((p): p is { id_producto: number; sku: string } => Boolean(p.sku))
      .map((p) => [p.sku, p.id_producto])
  );
  // Match case-insensitive por si la collation no lo hace
  const bySkuLower = new Map(
    [...bySku.entries()].map(([sku, id]) => [sku.toLowerCase(), id])
  );

  const existing = await prisma.promocion_producto.findMany({
    where: { id_promocion },
    select: { id_producto: true },
  });
  const linked = new Set(existing.map((e) => e.id_producto));

  const toAdd = new Set<number>();
  const missing: string[] = [];
  let dup = 0;

  for (const sku of skus) {
    const id = bySku.get(sku) ?? bySkuLower.get(sku.toLowerCase());
    if (!id) {
      missing.push(sku);
      continue;
    }
    if (linked.has(id) || toAdd.has(id)) {
      dup += 1;
      continue;
    }
    toAdd.add(id);
  }

  if (toAdd.size) {
    await prisma.promocion_producto.createMany({
      data: [...toAdd].map((id_producto) => ({ id_promocion, id_producto })),
      skipDuplicates: true,
    });
  }

  revalidatePromo(promo.slug);
  revalidatePath(`/admin/promociones/${id_promocion}`);

  const params = new URLSearchParams({
    csv_added: String(toAdd.size),
    csv_dup: String(dup),
    csv_missing: String(missing.length),
  });
  if (missing.length) {
    params.set("csv_miss_list", missing.slice(0, 15).join(","));
  }
  redirect(`/admin/promociones/${id_promocion}?${params.toString()}`);
}
