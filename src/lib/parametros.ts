import { prisma } from "@/lib/prisma";

export const PARAM_SMARTPOST_PRECIO = "smartpost_precio_envio";

export async function getParametro(nombre: string): Promise<string | null> {
  const row = await prisma.parametro.findUnique({ where: { nombre } });
  return row?.valor ?? null;
}

export async function getParametroNumber(nombre: string): Promise<number | null> {
  const raw = await getParametro(nombre);
  if (raw == null || raw === "") return null;
  const n = Number(String(raw).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export async function upsertParametro(input: {
  nombre: string;
  tipo: string;
  valor: string;
}) {
  return prisma.parametro.upsert({
    where: { nombre: input.nombre },
    create: {
      nombre: input.nombre,
      tipo: input.tipo,
      valor: input.valor,
    },
    update: {
      tipo: input.tipo,
      valor: input.valor,
    },
  });
}
