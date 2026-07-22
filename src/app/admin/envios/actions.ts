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
  PARAM_SMARTPOST_PRECIO,
  getParametroNumber,
  upsertParametro,
} from "@/lib/parametros";

function revalidateEnvios() {
  revalidatePath("/admin/envios");
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

  const precioRaw = String(formData.get("precio") || "").trim().replace(",", ".");
  const precio = Number(precioRaw);
  if (!Number.isFinite(precio) || precio < 0) {
    throw new Error("Indicá un precio válido para FastTrack (el Excel no incluye precio)");
  }

  const rows = parseFastrackWorkbook(buffer, { precio, zonasExcluir });
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

  let precio = await getParametroNumber(PARAM_SMARTPOST_PRECIO);
  const override = String(formData.get("precio") || "").trim().replace(",", ".");
  if (override) {
    const n = Number(override);
    if (!Number.isFinite(n) || n < 0) throw new Error("Precio inválido");
    precio = n;
    await upsertParametro({
      nombre: PARAM_SMARTPOST_PRECIO,
      tipo: "number",
      valor: String(n),
    });
  }
  if (precio == null) {
    throw new Error(
      `Falta el parámetro ${PARAM_SMARTPOST_PRECIO}. Configuralo en Parámetros antes de importar.`,
    );
  }

  const diasRaw = Number(String(formData.get("dias_entrega") || "1").replace(",", "."));
  const diasEntrega = Number.isFinite(diasRaw) && diasRaw > 0 ? Math.round(diasRaw) : 1;

  const rows = parseSmartpostWorkbook(buffer, { precio, diasEntrega });
  if (!rows.length) {
    throw new Error("No se importaron filas. Revisá el formato del Excel SmartPost.");
  }

  await replaceProveedorRows("smartpost", rows);
  revalidateEnvios();
  redirect(`/admin/envios?ok=smartpost&count=${rows.length}`);
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
