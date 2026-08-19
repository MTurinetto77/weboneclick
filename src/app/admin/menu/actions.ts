"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

async function guard() {
  await requireAdmin();
}

function revalidateMenu() {
  revalidateTag("main-nav", { expire: 0 });
  revalidatePath("/admin/menu");
}

/**
 * Builds the href for a category based on its nombre hierarchy.
 * Nombre format: "Parent / Child" → href "/parent-slug/child-slug"
 * For root categories (no " / "): href "/slug"
 *
 * The catch-all route resolves /a/b via slug join "a-b" fallback,
 * so we reconstruct the path from the nombre parts and slugify each.
 */
async function buildCategoryHref(id_categoria: number): Promise<string> {
  const cat = await prisma.categoria.findUnique({
    where: { id_categoria },
    select: { slug: true, nombre: true },
  });
  if (!cat) throw new Error("Categoría no encontrada");

  const parts = cat.nombre.split(" / ");
  if (parts.length >= 2) {
    const slugify = (s: string) =>
      s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return "/" + parts.map(slugify).join("/");
  }
  return `/${cat.slug}`;
}

/** Resolves href: if id_categoria is provided, compute from slug path; otherwise use manual href */
async function resolveHref(formData: FormData): Promise<{ href: string; id_categoria: number | null }> {
  const rawCat = Number(formData.get("id_categoria") || 0);
  if (rawCat > 0) {
    return { href: await buildCategoryHref(rawCat), id_categoria: rawCat };
  }
  const href = String(formData.get("href") || "").trim();
  if (!href) throw new Error("Href o categoría requerido");
  return { href, id_categoria: null };
}

// --------------- Menu Item ---------------

export async function createMenuItem(formData: FormData) {
  await guard();

  const label = String(formData.get("label") || "").trim();
  if (!label) throw new Error("Label requerido");

  const { href, id_categoria } = await resolveHref(formData);
  const tipo = String(formData.get("tipo") || "dinamico").trim();
  const shop_label = String(formData.get("shop_label") || "").trim() || null;
  const dynamic_children = String(formData.get("dynamic_children") || "").trim() || null;
  const badge = String(formData.get("badge") || "").trim() || null;
  const orden = Number(formData.get("orden") || 0);

  const item = await prisma.menu_item.create({
    data: {
      label,
      href,
      id_categoria,
      shop_label,
      tipo,
      dynamic_children,
      badge,
      orden: Number.isFinite(orden) ? orden : 0,
      activo: true,
    },
  });

  revalidateMenu();
  redirect(`/admin/menu/${item.id_menu_item}`);
}

export async function updateMenuItem(id: number, formData: FormData) {
  await guard();
  const existing = await prisma.menu_item.findUnique({ where: { id_menu_item: id } });
  if (!existing) throw new Error("Item no encontrado");

  const label = String(formData.get("label") || "").trim();
  if (!label) throw new Error("Label requerido");

  const { href, id_categoria } = await resolveHref(formData);

  await prisma.menu_item.update({
    where: { id_menu_item: id },
    data: {
      label,
      href,
      id_categoria,
      shop_label: String(formData.get("shop_label") || "").trim() || null,
      tipo: existing.tipo === "fijo" ? "fijo" : String(formData.get("tipo") || "dinamico").trim(),
      dynamic_children: String(formData.get("dynamic_children") || "").trim() || null,
      badge: String(formData.get("badge") || "").trim() || null,
      orden: Number(formData.get("orden") || 0),
      activo: formData.get("activo") === "on",
    },
  });

  revalidateMenu();
  revalidatePath(`/admin/menu/${id}`);
}

export async function deleteMenuItem(id: number) {
  await guard();
  const existing = await prisma.menu_item.findUnique({ where: { id_menu_item: id } });
  if (!existing) throw new Error("Item no encontrado");
  if (existing.tipo === "fijo") throw new Error("No se puede eliminar un item fijo");

  await prisma.menu_item.delete({ where: { id_menu_item: id } });
  revalidateMenu();
  redirect("/admin/menu");
}

export async function toggleMenuItem(id: number) {
  await guard();
  const existing = await prisma.menu_item.findUnique({ where: { id_menu_item: id } });
  if (!existing) throw new Error("Item no encontrado");

  await prisma.menu_item.update({
    where: { id_menu_item: id },
    data: { activo: !existing.activo },
  });

  revalidateMenu();
}

export async function moveMenuItem(id: number, direction: "up" | "down") {
  await guard();
  const all = await prisma.menu_item.findMany({ orderBy: { orden: "asc" } });
  const idx = all.findIndex((i) => i.id_menu_item === id);
  if (idx < 0) return;

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= all.length) return;

  const a = all[idx];
  const b = all[swapIdx];

  await prisma.$transaction([
    prisma.menu_item.update({ where: { id_menu_item: a.id_menu_item }, data: { orden: b.orden } }),
    prisma.menu_item.update({ where: { id_menu_item: b.id_menu_item }, data: { orden: a.orden } }),
  ]);

  revalidateMenu();
}

// --------------- Menu Item Hijo ---------------

export async function upsertMenuChild(id_menu_item: number, formData: FormData) {
  await guard();

  const id_menu_hijo = Number(formData.get("id_menu_hijo") || 0);
  const label = String(formData.get("label") || "").trim();
  if (!label) throw new Error("Label requerido");

  const { href, id_categoria } = await resolveHref(formData);

  const data = {
    id_menu_item,
    label,
    href,
    id_categoria,
    badge: String(formData.get("badge") || "").trim() || null,
    icon: String(formData.get("icon") || "").trim() || null,
    variant: String(formData.get("variant") || "product").trim(),
    orden: Number(formData.get("orden") || 0),
    activo: formData.get("activo") === "on",
  };

  if (id_menu_hijo > 0) {
    await prisma.menu_item_hijo.update({ where: { id_menu_hijo }, data });
  } else {
    await prisma.menu_item_hijo.create({ data });
  }

  revalidateMenu();
  revalidatePath(`/admin/menu/${id_menu_item}`);
}

export async function deleteMenuChild(id_menu_hijo: number, id_menu_item: number) {
  await guard();
  await prisma.menu_item_hijo.delete({ where: { id_menu_hijo } });
  revalidateMenu();
  revalidatePath(`/admin/menu/${id_menu_item}`);
}

export async function moveMenuChild(id_menu_hijo: number, id_menu_item: number, direction: "up" | "down") {
  await guard();
  const all = await prisma.menu_item_hijo.findMany({
    where: { id_menu_item },
    orderBy: { orden: "asc" },
  });
  const idx = all.findIndex((i) => i.id_menu_hijo === id_menu_hijo);
  if (idx < 0) return;

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= all.length) return;

  const a = all[idx];
  const b = all[swapIdx];

  await prisma.$transaction([
    prisma.menu_item_hijo.update({ where: { id_menu_hijo: a.id_menu_hijo }, data: { orden: b.orden } }),
    prisma.menu_item_hijo.update({ where: { id_menu_hijo: b.id_menu_hijo }, data: { orden: a.orden } }),
  ]);

  revalidateMenu();
  revalidatePath(`/admin/menu/${id_menu_item}`);
}
