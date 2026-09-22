"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { deleteUploadedFile, saveUploadedFile } from "@/lib/uploads";
import { parseSkusFromCsv } from "@/lib/csv-skus";

async function guard() {
  await requireAdmin();
}

/** El badge aparece en cards de todo el sitio (home, shop, categorías, promos). */
function revalidateEtiqueta(id_etiqueta_web?: number) {
  revalidatePath("/admin/etiquetas-producto");
  if (id_etiqueta_web) revalidatePath(`/admin/etiquetas-producto/${id_etiqueta_web}`);
  // Los listados de productos (con badge) están en unstable_cache con tag "products".
  revalidateTag("products", { expire: 0 });
  revalidatePath("/", "layout");
}

export async function createEtiquetaWeb(formData: FormData) {
  await guard();
  const nombre = String(formData.get("nombre") || "").trim();
  if (!nombre) throw new Error("Nombre requerido");

  const prioridad = Number(formData.get("prioridad") || 0);

  let imagen: string | null = null;
  const imagenFile = formData.get("imagen");
  if (imagenFile instanceof File && imagenFile.size > 0) {
    imagen = await saveUploadedFile(imagenFile, "etiquetas");
  }

  const etiqueta = await prisma.etiqueta_web.create({
    data: {
      nombre,
      imagen,
      prioridad: Number.isFinite(prioridad) ? prioridad : 0,
      activo: true,
    },
  });

  revalidateEtiqueta();
  redirect(`/admin/etiquetas-producto/${etiqueta.id_etiqueta_web}`);
}

export async function updateEtiquetaWeb(id_etiqueta_web: number, formData: FormData) {
  await guard();
  const existing = await prisma.etiqueta_web.findUnique({ where: { id_etiqueta_web } });
  if (!existing) throw new Error("Etiqueta no encontrada");

  const nombre = String(formData.get("nombre") || "").trim();
  if (!nombre) throw new Error("Nombre requerido");

  const prioridad = Number(formData.get("prioridad") || 0);
  const activo = formData.get("activo") === "on";
  const quitarImagen = formData.get("quitar_imagen") === "on";

  let imagen = existing.imagen;
  const imagenFile = formData.get("imagen");
  if (imagenFile instanceof File && imagenFile.size > 0) {
    imagen = await saveUploadedFile(imagenFile, "etiquetas");
    if (existing.imagen) {
      await deleteUploadedFile(existing.imagen).catch(() => undefined);
    }
  } else if (quitarImagen) {
    if (existing.imagen) {
      await deleteUploadedFile(existing.imagen).catch(() => undefined);
    }
    imagen = null;
  }

  await prisma.etiqueta_web.update({
    where: { id_etiqueta_web },
    data: {
      nombre,
      imagen,
      prioridad: Number.isFinite(prioridad) ? prioridad : 0,
      activo,
    },
  });

  revalidateEtiqueta(id_etiqueta_web);
}

export async function deleteEtiquetaWeb(id_etiqueta_web: number) {
  await guard();
  const existing = await prisma.etiqueta_web.findUnique({ where: { id_etiqueta_web } });
  if (!existing) throw new Error("Etiqueta no encontrada");

  if (existing.imagen) {
    await deleteUploadedFile(existing.imagen).catch(() => undefined);
  }

  await prisma.etiqueta_web.delete({ where: { id_etiqueta_web } });
  revalidateEtiqueta();
  redirect("/admin/etiquetas-producto");
}

export async function addEtiquetaWebProducto(id_etiqueta_web: number, formData: FormData) {
  await guard();
  const id_producto = Number(formData.get("id_producto"));
  if (!Number.isFinite(id_producto) || id_producto <= 0) {
    throw new Error("Producto inválido");
  }

  await prisma.etiqueta_web_producto.upsert({
    where: {
      id_etiqueta_web_id_producto: { id_etiqueta_web, id_producto },
    },
    create: { id_etiqueta_web, id_producto },
    update: {},
  });

  revalidateEtiqueta(id_etiqueta_web);
}

export async function addEtiquetaWebProductos(id_etiqueta_web: number, formData: FormData) {
  await guard();
  const ids = formData
    .getAll("id_producto")
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!ids.length) return;

  await prisma.etiqueta_web_producto.createMany({
    data: ids.map((id_producto) => ({ id_etiqueta_web, id_producto })),
    skipDuplicates: true,
  });

  revalidateEtiqueta(id_etiqueta_web);
}

export async function removeEtiquetaWebProducto(id_etiqueta_web: number, id_producto: number) {
  await guard();
  await prisma.etiqueta_web_producto.deleteMany({ where: { id_etiqueta_web, id_producto } });
  revalidateEtiqueta(id_etiqueta_web);
}

export async function importEtiquetaWebProductosCsv(id_etiqueta_web: number, formData: FormData) {
  await guard();
  const etiqueta = await prisma.etiqueta_web.findUnique({ where: { id_etiqueta_web } });
  if (!etiqueta) throw new Error("Etiqueta no encontrada");

  const file = formData.get("csv");
  if (!(file instanceof File) || file.size === 0) {
    redirect(`/admin/etiquetas-producto/${id_etiqueta_web}?csv_err=archivo`);
  }

  const skus = parseSkusFromCsv(await file.text());
  if (!skus.length) {
    redirect(`/admin/etiquetas-producto/${id_etiqueta_web}?csv_err=vacio`);
  }

  const productos = await prisma.producto.findMany({
    where: { sku: { in: skus } },
    select: { id_producto: true, sku: true },
  });
  // Match case-insensitive por si la collation no lo hace
  const bySkuLower = new Map(
    productos
      .filter((p): p is { id_producto: number; sku: string } => Boolean(p.sku))
      .map((p) => [p.sku.toLowerCase(), p.id_producto])
  );

  const existing = await prisma.etiqueta_web_producto.findMany({
    where: { id_etiqueta_web },
    select: { id_producto: true },
  });
  const linked = new Set(existing.map((e) => e.id_producto));

  const toAdd = new Set<number>();
  const missing: string[] = [];
  let dup = 0;

  for (const sku of skus) {
    const id = bySkuLower.get(sku.toLowerCase());
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
    await prisma.etiqueta_web_producto.createMany({
      data: [...toAdd].map((id_producto) => ({ id_etiqueta_web, id_producto })),
      skipDuplicates: true,
    });
  }

  revalidateEtiqueta(id_etiqueta_web);

  const params = new URLSearchParams({
    csv_added: String(toAdd.size),
    csv_dup: String(dup),
    csv_missing: String(missing.length),
  });
  if (missing.length) {
    params.set("csv_miss_list", missing.slice(0, 15).join(","));
  }
  redirect(`/admin/etiquetas-producto/${id_etiqueta_web}?${params.toString()}`);
}
