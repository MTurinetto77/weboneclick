"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

async function guard() {
  await requireAdmin();
}

function revalidateSecciones(id_seccion?: number) {
  revalidatePath("/admin/secciones-productos");
  revalidatePath("/");
  if (id_seccion) {
    revalidatePath(`/admin/secciones-productos/${id_seccion}`);
  }
}

export async function updateSeccion(id_seccion: number, formData: FormData) {
  await guard();
  const existing = await prisma.seccion.findUnique({ where: { id_seccion } });
  if (!existing) throw new Error("Sección no encontrada");

  const nombre = String(formData.get("nombre") || "").trim();
  if (!nombre) throw new Error("Nombre requerido");
  const activo = formData.get("activo") === "on";

  await prisma.seccion.update({
    where: { id_seccion },
    data: { nombre, activo },
  });

  revalidateSecciones(id_seccion);
}

export async function addSeccionProducto(id_seccion: number, formData: FormData) {
  await guard();
  const id_producto = Number(formData.get("id_producto"));
  if (!Number.isFinite(id_producto) || id_producto <= 0) {
    throw new Error("Producto inválido");
  }

  const seccion = await prisma.seccion.findUnique({ where: { id_seccion } });
  if (!seccion) throw new Error("Sección no encontrada");

  let pestana = String(formData.get("pestana") || "").trim();
  if (seccion.clave === "destacados") {
    if (!["apple", "jbl", "accesorios"].includes(pestana)) {
      throw new Error("Pestaña inválida");
    }
  } else {
    pestana = "";
  }

  const maxOrden = await prisma.seccion_producto.aggregate({
    where: { id_seccion, pestana },
    _max: { orden: true },
  });
  const orden = (maxOrden._max.orden ?? -1) + 1;

  await prisma.seccion_producto.upsert({
    where: {
      id_seccion_id_producto_pestana: { id_seccion, id_producto, pestana },
    },
    create: { id_seccion, id_producto, pestana, orden },
    update: {},
  });

  revalidateSecciones(id_seccion);
}

export async function removeSeccionProducto(
  id_seccion: number,
  id_producto: number,
  pestana: string
) {
  await guard();
  await prisma.seccion_producto.deleteMany({
    where: { id_seccion, id_producto, pestana },
  });
  revalidateSecciones(id_seccion);
}

export async function moveSeccionProducto(
  id_seccion: number,
  id_producto: number,
  pestana: string,
  direction: "up" | "down"
) {
  await guard();
  const rows = await prisma.seccion_producto.findMany({
    where: { id_seccion, pestana },
    orderBy: { orden: "asc" },
  });
  const idx = rows.findIndex((r) => r.id_producto === id_producto);
  if (idx < 0) return;

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= rows.length) return;

  const a = rows[idx]!;
  const b = rows[swapIdx]!;

  await prisma.$transaction([
    prisma.seccion_producto.update({
      where: {
        id_seccion_id_producto_pestana: {
          id_seccion,
          id_producto: a.id_producto,
          pestana,
        },
      },
      data: { orden: b.orden },
    }),
    prisma.seccion_producto.update({
      where: {
        id_seccion_id_producto_pestana: {
          id_seccion,
          id_producto: b.id_producto,
          pestana,
        },
      },
      data: { orden: a.orden },
    }),
  ]);

  revalidateSecciones(id_seccion);
}
