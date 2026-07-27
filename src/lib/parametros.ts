import { prisma } from "@/lib/prisma";

export const PARAM_SMARTPOST_PRECIO = "smartpost_precio_envio";
export const PARAM_VALOR_ENVIO_GRATIS = "valor_para_envio_gratis";
export const DEFAULT_VALOR_ENVIO_GRATIS = 200_000;
export const GRUPO_ENVIOS = "envios";

/** Precios FastTrack por zona (parámetros fastrack_precio_zona_N). */
export const FASTRACK_ZONAS_PRECIO = [2, 3, 4, 5, 6, 7] as const;

export const FASTRACK_PRECIO_ZONA_DEFAULTS: Record<number, string> = {
  2: "13779.77",
  3: "18516.84",
  4: "21407.82",
  5: "22057.67",
  6: "24267.15",
  7: "26755.14",
};

export function paramFastrackPrecioZona(zona: number): string {
  return `fastrack_precio_zona_${zona}`;
}

export async function getParametro(nombre: string): Promise<string | null> {
  const row = await prisma.parametro.findUnique({ where: { nombre } });
  return row?.valor ?? null;
}

/** Parsea número desde parámetro (soporta 13779.77 o 13.779,77). */
export function parseParamNumber(raw: string): number | null {
  const s = String(raw || "").trim();
  if (!s) return null;
  if (s.includes(",") && s.includes(".")) {
    const n = Number(s.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  if (s.includes(",")) {
    const n = Number(s.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export async function getParametroNumber(nombre: string): Promise<number | null> {
  const raw = await getParametro(nombre);
  if (raw == null) return null;
  return parseParamNumber(raw);
}

/** Umbral de envío gratis desde parámetro (fallback 200.000). */
export async function getValorEnvioGratis(): Promise<number> {
  const n = await getParametroNumber(PARAM_VALOR_ENVIO_GRATIS);
  return n != null && n > 0 ? n : DEFAULT_VALOR_ENVIO_GRATIS;
}

/** Mapa zona → precio FastTrack desde parámetros (con defaults). */
export async function getFastrackPreciosPorZona(): Promise<Record<number, number>> {
  const names = FASTRACK_ZONAS_PRECIO.map(paramFastrackPrecioZona);
  const rows = await prisma.parametro.findMany({
    where: { nombre: { in: [...names] } },
  });
  const byName = Object.fromEntries(rows.map((r) => [r.nombre, r.valor]));

  const out: Record<number, number> = {};
  for (const zona of FASTRACK_ZONAS_PRECIO) {
    const nombre = paramFastrackPrecioZona(zona);
    const raw = byName[nombre] ?? FASTRACK_PRECIO_ZONA_DEFAULTS[zona];
    const n = parseParamNumber(raw);
    if (n != null && n >= 0) out[zona] = n;
  }
  return out;
}

export async function getParametrosEnvioPrecios(): Promise<{
  smartpost: string;
  zonas: Record<number, string>;
}> {
  const names = [
    PARAM_SMARTPOST_PRECIO,
    ...FASTRACK_ZONAS_PRECIO.map(paramFastrackPrecioZona),
  ];
  const rows = await prisma.parametro.findMany({
    where: { nombre: { in: names } },
  });
  const byName = Object.fromEntries(rows.map((r) => [r.nombre, r.valor]));

  const zonas: Record<number, string> = {};
  for (const zona of FASTRACK_ZONAS_PRECIO) {
    zonas[zona] =
      byName[paramFastrackPrecioZona(zona)] ?? FASTRACK_PRECIO_ZONA_DEFAULTS[zona];
  }

  return {
    smartpost: byName[PARAM_SMARTPOST_PRECIO] ?? "4380.44",
    zonas,
  };
}

export async function upsertParametro(input: {
  nombre: string;
  tipo: string;
  valor: string;
  grupo_parametros?: string | null;
}) {
  return prisma.parametro.upsert({
    where: { nombre: input.nombre },
    create: {
      nombre: input.nombre,
      tipo: input.tipo,
      valor: input.valor,
      grupo_parametros: input.grupo_parametros ?? null,
    },
    update: {
      tipo: input.tipo,
      valor: input.valor,
      ...(input.grupo_parametros !== undefined
        ? { grupo_parametros: input.grupo_parametros }
        : {}),
    },
  });
}
