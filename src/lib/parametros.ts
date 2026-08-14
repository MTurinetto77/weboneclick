import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const PARAM_VALOR_ENVIO_GRATIS = "valor_para_envio_gratis";
export const DEFAULT_VALOR_ENVIO_GRATIS = 200_000;
export const GRUPO_ENVIOS = "envios";

export const GRUPO_PRECIOS = "precios";
/** A partir de cuántas cuotas del producto aplica el descuento contado. */
export const PARAM_CANTIDAD_CUOTAS_BASE_DESCUENTO_CONTADO =
  "cantidad_cuotas_base_descuento_contado";
export const DEFAULT_CANTIDAD_CUOTAS_BASE_DESCUENTO_CONTADO = 12;
/** Porcentaje de descuento contado (20 = 20%). */
export const PARAM_PORCENTAJE_DESCUENTO_CONTADO_SEGUN_CUOTA =
  "porcentaje_descuento_contado_segun_cuota";
export const DEFAULT_PORCENTAJE_DESCUENTO_CONTADO_SEGUN_CUOTA = 20;

export type DescuentoContadoConfig = {
  umbralCuotas: number;
  porcentaje: number;
};

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

/**
 * SmartPost — columna Excel CORDON.
 * Se guarda en codigo_postal_envio.zona (1=CABA … 4=CORDON 3).
 */
export const SMARTPOST_CORDONES = [
  {
    zona: 1,
    label: "CABA",
    slug: "caba",
    param: "smartpost_precio_caba",
    defaultValor: "4380.44",
  },
  {
    zona: 2,
    label: "CORDON 1",
    slug: "cordon_1",
    param: "smartpost_precio_cordon_1",
    defaultValor: "7002.44",
  },
  {
    zona: 3,
    label: "CORDON 2",
    slug: "cordon_2",
    param: "smartpost_precio_cordon_2",
    defaultValor: "9733.69",
  },
  {
    zona: 4,
    label: "CORDON 3",
    slug: "cordon_3",
    param: "smartpost_precio_cordon_3",
    defaultValor: "9733.69",
  },
] as const;

export type SmartpostCordonSlug = (typeof SMARTPOST_CORDONES)[number]["slug"];

export function paramSmartpostPrecioCordon(slug: string): string {
  const found = SMARTPOST_CORDONES.find((c) => c.slug === slug);
  return found?.param ?? `smartpost_precio_${slug}`;
}

/** Normaliza texto CORDON del Excel → slug interno. */
export function normalizeSmartpostCordon(
  raw: string,
): SmartpostCordonSlug | null {
  const s = String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
  if (!s) return null;
  if (s === "CABA" || s.startsWith("CABA ")) return "caba";
  if (s === "CORDON 1" || s === "CORDÓN 1" || s === "CORDON1") return "cordon_1";
  if (s === "CORDON 2" || s === "CORDÓN 2" || s === "CORDON2") return "cordon_2";
  if (s === "CORDON 3" || s === "CORDÓN 3" || s === "CORDON3") return "cordon_3";
  return null;
}

export function smartpostCordonBySlug(slug: string) {
  return SMARTPOST_CORDONES.find((c) => c.slug === slug) ?? null;
}

export function smartpostCordonLabel(zona: number | null | undefined): string | null {
  if (zona == null) return null;
  return SMARTPOST_CORDONES.find((c) => c.zona === zona)?.label ?? null;
}

export function formatZonaEnvio(
  proveedor: string,
  zona: number | null | undefined,
): string {
  if (zona == null) return "—";
  if (proveedor === "smartpost") {
    return smartpostCordonLabel(zona) ?? String(zona);
  }
  return String(zona);
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

/** Config de descuento contado según cuotas del producto (dedupe por request RSC). */
export const getDescuentoContadoConfig = cache(
  async (): Promise<DescuentoContadoConfig> => {
    const [umbralRaw, pctRaw] = await Promise.all([
      getParametroNumber(PARAM_CANTIDAD_CUOTAS_BASE_DESCUENTO_CONTADO),
      getParametroNumber(PARAM_PORCENTAJE_DESCUENTO_CONTADO_SEGUN_CUOTA),
    ]);
    const umbralCuotas =
      umbralRaw != null && umbralRaw > 0
        ? umbralRaw
        : DEFAULT_CANTIDAD_CUOTAS_BASE_DESCUENTO_CONTADO;
    const porcentaje =
      pctRaw != null && pctRaw >= 0
        ? pctRaw
        : DEFAULT_PORCENTAJE_DESCUENTO_CONTADO_SEGUN_CUOTA;
    return { umbralCuotas, porcentaje };
  },
);

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

/** Mapa zona numérica → precio SmartPost (CABA=1 … CORDON 3=4). */
export async function getSmartpostPreciosPorCordon(): Promise<
  Record<number, number>
> {
  const names = SMARTPOST_CORDONES.map((c) => c.param);
  const rows = await prisma.parametro.findMany({
    where: { nombre: { in: [...names] } },
  });
  const byName = Object.fromEntries(rows.map((r) => [r.nombre, r.valor]));

  const out: Record<number, number> = {};
  for (const c of SMARTPOST_CORDONES) {
    const raw = byName[c.param] ?? c.defaultValor;
    const n = parseParamNumber(raw);
    if (n != null && n >= 0) out[c.zona] = n;
  }
  return out;
}

export async function getParametrosEnvioPrecios(): Promise<{
  smartpostCordones: Record<string, string>;
  fastrackZonas: Record<number, string>;
}> {
  const names = [
    ...SMARTPOST_CORDONES.map((c) => c.param),
    ...FASTRACK_ZONAS_PRECIO.map(paramFastrackPrecioZona),
  ];
  const rows = await prisma.parametro.findMany({
    where: { nombre: { in: names } },
  });
  const byName = Object.fromEntries(rows.map((r) => [r.nombre, r.valor]));

  const smartpostCordones: Record<string, string> = {};
  for (const c of SMARTPOST_CORDONES) {
    smartpostCordones[c.slug] = byName[c.param] ?? c.defaultValor;
  }

  const fastrackZonas: Record<number, string> = {};
  for (const zona of FASTRACK_ZONAS_PRECIO) {
    fastrackZonas[zona] =
      byName[paramFastrackPrecioZona(zona)] ?? FASTRACK_PRECIO_ZONA_DEFAULTS[zona];
  }

  return { smartpostCordones, fastrackZonas };
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
