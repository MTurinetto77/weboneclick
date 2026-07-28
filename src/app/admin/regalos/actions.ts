"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

async function guard() {
  return requireAdmin();
}

function revalidateRegalos(id?: number) {
  revalidatePath("/admin/regalos");
  revalidatePath("/checkout");
  if (id != null) revalidatePath(`/admin/regalos/${id}`);
}

function parseDate(raw: FormDataEntryValue | null) {
  const value = String(raw || "").trim();
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseMonto(raw: FormDataEntryValue | null) {
  const n = Number(String(raw || "").replace(",", ".").trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export async function createRegalo(formData: FormData) {
  const session = await guard();
  const idUsuario = session.user.id;
  if (!idUsuario || idUsuario <= 0) {
    throw new Error("Usuario de sesión inválido");
  }

  const nombre = String(formData.get("nombre") || "").trim();
  if (!nombre) throw new Error("Nombre requerido");

  const monto_minimo = parseMonto(formData.get("monto_minimo"));
  if (monto_minimo == null) throw new Error("Monto mínimo inválido");

  const vigencia_desde = parseDate(formData.get("vigencia_desde"));
  if (!vigencia_desde) throw new Error("Vigencia desde requerida");
  const vigencia_hasta = parseDate(formData.get("vigencia_hasta"));

  const regalo = await prisma.regalo.create({
    data: {
      nombre,
      monto_minimo,
      vigencia_desde,
      vigencia_hasta,
      activo: true,
      id_usuario_creacion: idUsuario,
    },
  });

  revalidateRegalos(regalo.id_regalo);
  redirect(`/admin/regalos/${regalo.id_regalo}`);
}

export async function updateRegalo(id_regalo: number, formData: FormData) {
  await guard();
  const existing = await prisma.regalo.findUnique({ where: { id_regalo } });
  if (!existing) throw new Error("Regalo no encontrado");

  const nombre = String(formData.get("nombre") || "").trim();
  if (!nombre) throw new Error("Nombre requerido");

  const monto_minimo = parseMonto(formData.get("monto_minimo"));
  if (monto_minimo == null) throw new Error("Monto mínimo inválido");

  const vigencia_desde = parseDate(formData.get("vigencia_desde"));
  if (!vigencia_desde) throw new Error("Vigencia desde requerida");
  const vigencia_hasta = parseDate(formData.get("vigencia_hasta"));
  const activo = formData.get("activo") === "on";

  await prisma.regalo.update({
    where: { id_regalo },
    data: {
      nombre,
      monto_minimo,
      vigencia_desde,
      vigencia_hasta,
      activo,
    },
  });

  revalidateRegalos(id_regalo);
}

export async function deleteRegalo(id_regalo: number) {
  await guard();
  const existing = await prisma.regalo.findUnique({ where: { id_regalo } });
  if (!existing) throw new Error("Regalo no encontrado");

  await prisma.regalo.delete({ where: { id_regalo } });
  revalidateRegalos();
  redirect("/admin/regalos");
}

export async function addRegaloProducto(id_regalo: number, formData: FormData) {
  await guard();
  const id_producto = Number(formData.get("id_producto"));
  if (!Number.isFinite(id_producto) || id_producto <= 0) {
    throw new Error("Producto inválido");
  }

  const regalo = await prisma.regalo.findUnique({ where: { id_regalo } });
  if (!regalo) throw new Error("Regalo no encontrado");

  await prisma.regalo_producto.upsert({
    where: {
      id_regalo_id_producto: { id_regalo, id_producto },
    },
    create: { id_regalo, id_producto },
    update: {},
  });

  revalidateRegalos(id_regalo);
}

export async function removeRegaloProducto(id_regalo: number, id_producto: number) {
  await guard();
  await prisma.regalo_producto.deleteMany({ where: { id_regalo, id_producto } });
  revalidateRegalos(id_regalo);
}
