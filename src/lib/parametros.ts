import { prisma } from "@/lib/prisma";

export const PARAM_SMARTPOST_PRECIO = "smartpost_precio_envio";
export const PARAM_VALOR_ENVIO_GRATIS = "valor_para_envio_gratis";
export const DEFAULT_VALOR_ENVIO_GRATIS = 200_000;

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

/** Umbral de envío gratis desde parámetro (fallback 200.000). */
export async function getValorEnvioGratis(): Promise<number> {
  const n = await getParametroNumber(PARAM_VALOR_ENVIO_GRATIS);
  return n != null && n > 0 ? n : DEFAULT_VALOR_ENVIO_GRATIS;
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
