"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guard";
import {
  CUPON_ESTADO_EMITIDO,
  generateUniqueCodigos,
  normalizeCuponCodigo,
} from "@/lib/cupones";
import { prisma } from "@/lib/prisma";

async function guard() {
  return requireAdmin();
}

export async function generarCupones(formData: FormData) {
  const session = await guard();
  const idUsuario = session.user.id;
  if (!idUsuario || idUsuario <= 0) {
    throw new Error("Usuario de sesión inválido");
  }

  const cantidad = Math.floor(Number(formData.get("cantidad")));
  const prefijo = String(formData.get("prefijo") || "").trim();
  const monto = Number(formData.get("monto"));
  const vigenciaRaw = String(formData.get("fecha_vigencia") || "").trim();
  const grupoRaw = String(formData.get("grupo") || "").trim();
  const grupo = grupoRaw ? grupoRaw.slice(0, 100) : null;

  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 5000) {
    throw new Error("La cantidad debe ser un entero entre 1 y 5000");
  }
  if (!prefijo) {
    throw new Error("Ingresá el comienzo del código (prefijo)");
  }
  if (!/^[A-Za-z0-9_-]+$/.test(prefijo)) {
    throw new Error("El prefijo solo puede tener letras, números, guión y guión bajo");
  }
  if (!(monto > 0) || !Number.isFinite(monto)) {
    throw new Error("El monto debe ser mayor a 0");
  }
  if (!vigenciaRaw) {
    throw new Error("Indicá la fecha de vigencia");
  }

  const fecha_vigencia = new Date(
    vigenciaRaw.includes("T") ? vigenciaRaw : `${vigenciaRaw}T23:59:59`,
  );
  if (Number.isNaN(fecha_vigencia.getTime())) {
    throw new Error("Fecha de vigencia inválida");
  }

  const codigos = await generateUniqueCodigos(prefijo, cantidad);
  const prefixNorm = normalizeCuponCodigo(prefijo);

  const chunkSize = 500;
  for (let i = 0; i < codigos.length; i += chunkSize) {
    const chunk = codigos.slice(i, i + chunkSize);
    await prisma.cupones_descuento.createMany({
      data: chunk.map((codigo) => ({
        codigo,
        monto,
        fecha_vigencia,
        estado: CUPON_ESTADO_EMITIDO,
        grupo,
        id_usuario_creacion: idUsuario,
      })),
    });
  }

  revalidatePath("/admin/descuentos");
  const grupoQs = grupo ? `&grupo=${encodeURIComponent(grupo)}` : "";
  redirect(
    `/admin/descuentos?ok=1&count=${codigos.length}&prefijo=${encodeURIComponent(prefixNorm)}${grupoQs}`,
  );
}
