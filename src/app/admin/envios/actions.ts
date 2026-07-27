"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import {
  parseFastrackWorkbook,
  parseSmartpostWorkbook,
  parseZonasExcluir,
  type CpEnvioRow,
  type ProveedorEnvio,
} from "@/lib/envio-import";
import {
  FASTRACK_ZONAS_PRECIO,
  GRUPO_ENVIOS,
  PARAM_SMARTPOST_PRECIO,
  getFastrackPreciosPorZona,
  paramFastrackPrecioZona,
  parseParamNumber,
} from "@/lib/parametros";

function revalidateEnvios() {
  revalidatePath("/admin/envios");
  revalidatePath("/admin/parametros");
}

async function replaceProveedorRows(proveedor: ProveedorEnvio, rows: CpEnvioRow[]) {
  await prisma.$transaction(async (tx) => {
    await tx.codigo_postal_envio.deleteMany({ where: { proveedor } });
    if (!rows.length) return;

    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      await tx.codigo_postal_envio.createMany({
        data: chunk.map((r) => ({
          proveedor: r.proveedor,
          codigo_postal: r.codigo_postal,
          localidad: r.localidad.slice(0, 255),
          dias_entrega: r.dias_entrega,
          precio: new Prisma.Decimal(r.precio),
          zona: r.zona ?? null,
        })),
      });
    }
  });
}

async function readUpload(formData: FormData, field = "archivo"): Promise<Buffer> {
  const file = formData.get(field);
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Seleccioná un archivo Excel (.xlsx)");
  }
  const name = file.name.toLowerCase();
  if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
    throw new Error("El archivo debe ser .xlsx o .xls");
  }
  return Buffer.from(await file.arrayBuffer());
}

export async function importFastrack(formData: FormData) {
  await requireAdmin();

  const buffer = await readUpload(formData);
  const zonasRaw = String(formData.get("zonas_excluir") ?? "1");
  const zonasExcluir = parseZonasExcluir(zonasRaw, [1]);
  const preciosPorZona = await getFastrackPreciosPorZona();

  const rows = parseFastrackWorkbook(buffer, { zonasExcluir, preciosPorZona });
  if (!rows.length) {
    throw new Error("No se importaron filas. Revisá el archivo o las zonas excluidas.");
  }

  await replaceProveedorRows("fastrack", rows);
  revalidateEnvios();
  redirect(
    `/admin/envios?ok=fastrack&count=${rows.length}&excluidas=${[...zonasExcluir].join(",")}`,
  );
}

export async function importSmartpost(formData: FormData) {
  await requireAdmin();

  const buffer = await readUpload(formData);
  const rows = parseSmartpostWorkbook(buffer, { diasEntrega: 1 });
  if (!rows.length) {
    throw new Error("No se importaron filas. Revisá el formato del Excel SmartPost.");
  }

  await replaceProveedorRows("smartpost", rows);
  revalidateEnvios();
  redirect(`/admin/envios?ok=smartpost&count=${rows.length}`);
}

/**
 * Guarda precios de envío (grupo envios) y recalcula codigo_postal_envio.
 * FastTrack: por zona. SmartPost: precio único del parámetro.
 */
export async function updatePreciosEnvioAction(formData: FormData) {
  await requireAdmin();

  const smartpostRaw = String(formData.get("smartpost_precio") || "").trim();
  const smartpostPrecio = parseParamNumber(smartpostRaw);
  if (smartpostPrecio == null || smartpostPrecio < 0) {
    throw new Error("Precio SmartPost inválido");
  }

  const preciosZona: Record<number, number> = {};
  for (const zona of FASTRACK_ZONAS_PRECIO) {
    const raw = String(formData.get(`fastrack_zona_${zona}`) || "").trim();
    const n = parseParamNumber(raw);
    if (n == null || n < 0) {
      throw new Error(`Precio FastTrack zona ${zona} inválido`);
    }
    preciosZona[zona] = n;
  }

  await prisma.$transaction(async (tx) => {
    await tx.parametro.upsert({
      where: { nombre: PARAM_SMARTPOST_PRECIO },
      create: {
        nombre: PARAM_SMARTPOST_PRECIO,
        tipo: "number",
        valor: String(smartpostPrecio),
        grupo_parametros: GRUPO_ENVIOS,
      },
      update: {
        tipo: "number",
        valor: String(smartpostPrecio),
        grupo_parametros: GRUPO_ENVIOS,
      },
    });

    for (const zona of FASTRACK_ZONAS_PRECIO) {
      const nombre = paramFastrackPrecioZona(zona);
      await tx.parametro.upsert({
        where: { nombre },
        create: {
          nombre,
          tipo: "number",
          valor: String(preciosZona[zona]),
          grupo_parametros: GRUPO_ENVIOS,
        },
        update: {
          tipo: "number",
          valor: String(preciosZona[zona]),
          grupo_parametros: GRUPO_ENVIOS,
        },
      });
    }

    await tx.codigo_postal_envio.updateMany({
      where: { proveedor: "smartpost" },
      data: { precio: new Prisma.Decimal(smartpostPrecio) },
    });

    for (const zona of FASTRACK_ZONAS_PRECIO) {
      await tx.codigo_postal_envio.updateMany({
        where: { proveedor: "fastrack", zona },
        data: { precio: new Prisma.Decimal(preciosZona[zona]) },
      });
    }
  });

  revalidateEnvios();
  redirect("/admin/envios?precios=ok");
}

export async function deleteCpEnvioAction(id_cp_envio: number) {
  await requireAdmin();
  await prisma.codigo_postal_envio.delete({ where: { id_cp_envio } }).catch(() => null);
  revalidateEnvios();
}

export async function clearProveedorAction(formData: FormData) {
  await requireAdmin();
  const proveedor = String(formData.get("proveedor") || "").trim() as ProveedorEnvio;
  if (proveedor !== "fastrack" && proveedor !== "smartpost") {
    throw new Error("Proveedor inválido");
  }
  await prisma.codigo_postal_envio.deleteMany({ where: { proveedor } });
  revalidateEnvios();
  redirect(`/admin/envios?cleared=${proveedor}`);
}
