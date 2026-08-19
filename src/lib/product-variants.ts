import { prisma } from "./prisma";
import { pickCurrentPriceInfo, precioEfectivo, resolveStockAvailability } from "./products";

/**
 * Los SKU de Odoo no tienen modelo de variantes: cada combinación
 * color/almacenamiento/teclado es un `producto` independiente y el título viene
 * escrito con criterios distintos según quién lo cargó. Ejemplos reales:
 *
 *   MacBook Air 13 M4 10CPU 10GPU 16GB 512GB - Medianoche
 *   MacBook Air 13" M4 10C/8G 16GB 256GB - Blanco Estelar - Ing
 *   MacBook Air 13 M4 10CPU 10GPU 24GB RAM 512GB - Azul Cielo
 *   MacBook Air 13" M4 10CPU 8GPU 16GB 256GB - Plata - Inglés
 *
 * Este módulo normaliza esos títulos a ejes comparables SIN tocar la base:
 * todo el parseo ocurre en memoria al renderizar.
 */

export type Teclado = "Español" | "Inglés";

export type ColorInfo = {
  /** Slug estable para usar como key/valor de selección. */
  key: string;
  /** Etiqueta canónica en español (la que usa Apple en su lineup). */
  label: string;
  /** Color real de la tapa, para el swatch. */
  hex: string;
  /** Segundo tono para dar volumen al swatch. */
  hexSoft: string;
  /**
   * Color de texto legible sobre `hex`. Medianoche pide blanco; los tres
   * claros pedían tinta oscura (en blanco no se leían).
   */
  tinta: string;
};

export type VariantAxes = {
  familia: string;
  pulgadas: string | null;
  chip: string | null;
  cpu: number | null;
  gpu: number | null;
  ram: string | null;
  almacenamiento: string | null;
  color: ColorInfo | null;
  teclado: Teclado;
  cto: boolean;
};

const COLORES: ColorInfo[] = [
  { key: "medianoche", label: "Medianoche", hex: "#2E3641", hexSoft: "#3D4753", tinta: "#ffffff" },
  {
    key: "blanco-estelar",
    label: "Blanco estelar",
    hex: "#EFE4D2",
    hexSoft: "#F7F0E4",
    tinta: "#1d1d1f",
  },
  { key: "azul-cielo", label: "Azul cielo", hex: "#B4C7D9", hexSoft: "#CEDCE8", tinta: "#1d1d1f" },
  { key: "plata", label: "Color plata", hex: "#DFE1E3", hexSoft: "#F0F1F2", tinta: "#1d1d1f" },
];

/** Sinónimos ES/EN encontrados en el catálogo, normalizados sin acentos. */
const COLOR_ALIASES: Record<string, string> = {
  medianoche: "medianoche",
  midnight: "medianoche",
  "blanco estelar": "blanco-estelar",
  starlight: "blanco-estelar",
  "azul cielo": "azul-cielo",
  "sky blue": "azul-cielo",
  plata: "plata",
  "color plata": "plata",
  silver: "plata",
};

const COLOR_BY_KEY = new Map(COLORES.map((c) => [c.key, c]));

export function colorByKey(key: string): ColorInfo | null {
  return COLOR_BY_KEY.get(key) ?? null;
}

/** Quita acentos y colapsa espacios para comparar etiquetas escritas a mano. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function resolverColor(segmento: string): ColorInfo | null {
  const clave = COLOR_ALIASES[normalizar(segmento)];
  return clave ? (COLOR_BY_KEY.get(clave) ?? null) : null;
}

const RE_TECLADO = /english\s*keyboard|teclado\s*ingl|ingles|\bingl?\b/;
const RE_CAPACIDAD = /(\d+)\s*(GB|TB)/gi;

/**
 * Extrae los ejes de un título de Odoo. Tolera las cuatro formas de escribir
 * CPU/GPU que aparecen en el catálogo (`10CPU 10GPU`, `10C/8G`, `10C/10G`) y el
 * `24GB RAM` que sólo algunos títulos incluyen.
 */
export function parseVariantAxes(titulo: string): VariantAxes {
  const cto = /^\s*CTO\b/i.test(titulo);
  const limpio = titulo.replace(/^\s*CTO\s+/i, "");

  const segmentos = limpio.split(/\s+-\s+/).map((s) => s.trim());
  const cabecera = segmentos[0] ?? "";
  const modificadores = segmentos.slice(1);

  const mFamilia = cabecera.match(/^(.*?)\s+(\d{2})["”]?\s/);
  const familia = (mFamilia?.[1] ?? cabecera.split(/\s+M\d/)[0] ?? cabecera).trim();
  const pulgadas = mFamilia?.[2] ?? null;

  const chip = cabecera.match(/\b([MA]\d{1,2})(\s+(?:Pro|Max|Ultra))?\b/)?.[0]?.trim() ?? null;

  // `10CPU 8GPU` o la forma abreviada `10C/8G`.
  let cpu = Number(cabecera.match(/(\d+)\s*CPU/i)?.[1] ?? NaN);
  let gpu = Number(cabecera.match(/(\d+)\s*GPU/i)?.[1] ?? NaN);
  if (!Number.isFinite(cpu) || !Number.isFinite(gpu)) {
    const abreviado = cabecera.match(/(\d+)\s*C\s*\/\s*(\d+)\s*G/i);
    if (abreviado) {
      cpu = Number(abreviado[1]);
      gpu = Number(abreviado[2]);
    }
  }

  // La primera capacidad es RAM y la última almacenamiento
  // (`16GB 512GB`, `24GB RAM 512GB`).
  const capacidades = [...cabecera.matchAll(RE_CAPACIDAD)].map(
    (m) => `${m[1]}${m[2].toUpperCase()}`
  );
  const ram = capacidades.length > 1 ? capacidades[0] : null;
  const almacenamiento = capacidades.at(-1) ?? null;

  let color: ColorInfo | null = null;
  let teclado: Teclado = "Español";
  for (const mod of modificadores) {
    if (RE_TECLADO.test(normalizar(mod))) {
      teclado = "Inglés";
      continue;
    }
    color ??= resolverColor(mod);
  }

  return {
    familia,
    pulgadas,
    chip,
    cpu: Number.isFinite(cpu) ? cpu : null,
    gpu: Number.isFinite(gpu) ? gpu : null,
    ram,
    almacenamiento,
    color,
    teclado,
    cto,
  };
}

/** Nombre corto y parejo para todas las variantes: "MacBook Air 13\" M4". */
export function nombreModelo(ejes: VariantAxes): string {
  return [ejes.familia, ejes.pulgadas ? `${ejes.pulgadas}"` : null, ejes.chip]
    .filter(Boolean)
    .join(" ");
}

/** Descripción normalizada de la configuración elegida. */
export function nombreConfiguracion(ejes: VariantAxes): string {
  const partes: string[] = [];
  if (ejes.cpu && ejes.gpu) partes.push(`CPU de ${ejes.cpu} núcleos`, `GPU de ${ejes.gpu} núcleos`);
  if (ejes.ram) partes.push(`${ejes.ram} de memoria`);
  if (ejes.almacenamiento) partes.push(`${ejes.almacenamiento} SSD`);
  return partes.join(" · ");
}

/** Ordena capacidades por tamaño real ("256GB" < "512GB" < "1TB"). */
export function capacidadEnGb(valor: string): number {
  const m = valor.match(/(\d+)\s*(GB|TB)/i);
  if (!m) return 0;
  return Number(m[1]) * (m[2].toUpperCase() === "TB" ? 1024 : 1);
}

export type VariantSibling = {
  idProducto: number;
  slug: string;
  titulo: string;
  sku: string | null;
  precio: number | null;
  precioConDesc: number | null;
  porcentajeDesc: number | null;
  precioEfectivo: number | null;
  inStock: boolean;
  imagenPrincipal: string | null;
  ejes: VariantAxes;
};

/**
 * Trae los SKU hermanos (misma categoría + misma familia/chip) para armar los
 * selectores. Es una lectura: no escribe nada.
 */
export async function getVariantSiblings(
  idCategoria: number,
  ejesRef: VariantAxes
): Promise<VariantSibling[]> {
  const filas = await prisma.producto.findMany({
    where: { activo: true, categorias: { some: { id_categoria: idCategoria } } },
    include: {
      precios: { orderBy: { fecha_desde: "desc" } },
      archivos: { include: { archivo: true } },
      stocks: { include: { almacen: true } },
    },
  });

  return filas
    .map((p) => {
      const ejes = parseVariantAxes(p.titulo);
      const precioInfo = pickCurrentPriceInfo(p.precios);
      const stock = resolveStockAvailability(p.stocks);
      const principal =
        p.archivos.find((a) => a.archivo.tipo === "imagen_principal")?.archivo.link ??
        p.archivos[0]?.archivo.link ??
        null;

      return {
        idProducto: p.id_producto,
        slug: p.slug,
        titulo: p.titulo,
        sku: p.sku,
        precio: precioInfo.precio,
        precioConDesc: precioInfo.precio_con_desc,
        porcentajeDesc: precioInfo.porcentaje_desc,
        precioEfectivo: precioEfectivo(precioInfo.precio, precioInfo.precio_con_desc),
        inStock: stock.inStock,
        imagenPrincipal: principal,
        ejes,
      };
    })
    .filter(
      (v) =>
        !v.ejes.cto &&
        v.ejes.color != null &&
        v.ejes.chip === ejesRef.chip &&
        normalizar(v.ejes.familia) === normalizar(ejesRef.familia)
    );
}

export type EjeSeleccion = "pulgadas" | "color" | "almacenamiento" | "teclado";

export type OpcionEje = {
  valor: string;
  label: string;
  /** Slug al que navegar; null si la combinación no existe en el catálogo. */
  slug: string | null;
  disponible: boolean;
  /** Sin stock pero el SKU existe. */
  agotado: boolean;
  /** Diferencia de precio contra la variante actual, para "+$120.000". */
  delta: number | null;
  hex?: string;
  hexSoft?: string;
};

function ejeValor(ejes: VariantAxes, eje: EjeSeleccion): string | null {
  switch (eje) {
    case "pulgadas":
      return ejes.pulgadas;
    case "color":
      return ejes.color?.key ?? null;
    case "almacenamiento":
      return ejes.almacenamiento;
    case "teclado":
      return ejes.teclado;
  }
}

/**
 * Para un eje dado, devuelve todas las opciones del catálogo indicando a qué
 * SKU lleva cada una manteniendo fijos los demás ejes. Si esa combinación no
 * existe (por ejemplo 15" en azul cielo), la opción queda deshabilitada.
 */
export function opcionesDeEje(
  eje: EjeSeleccion,
  actual: VariantAxes,
  hermanos: VariantSibling[],
  precioActual: number | null
): OpcionEje[] {
  const valores = new Map<string, { label: string; hex?: string; hexSoft?: string }>();
  for (const h of hermanos) {
    const v = ejeValor(h.ejes, eje);
    if (!v) continue;
    if (eje === "color" && h.ejes.color) {
      valores.set(v, {
        label: h.ejes.color.label,
        hex: h.ejes.color.hex,
        hexSoft: h.ejes.color.hexSoft,
      });
    } else if (eje === "pulgadas") {
      valores.set(v, { label: `${v}"` });
    } else {
      valores.set(v, { label: v });
    }
  }

  const otrosEjes: EjeSeleccion[] = (
    ["pulgadas", "color", "almacenamiento", "teclado"] as EjeSeleccion[]
  ).filter((e) => e !== eje);

  const ordenadas = [...valores.entries()].sort((a, b) => {
    if (eje === "almacenamiento") return capacidadEnGb(a[0]) - capacidadEnGb(b[0]);
    if (eje === "pulgadas") return Number(a[0]) - Number(b[0]);
    return a[1].label.localeCompare(b[1].label, "es");
  });

  return ordenadas.map(([valor, meta]) => {
    // Candidatos que coinciden en todos los ejes salvo el que estamos variando.
    const candidatos = hermanos.filter(
      (h) =>
        ejeValor(h.ejes, eje) === valor &&
        otrosEjes.every((otro) => ejeValor(h.ejes, otro) === ejeValor(actual, otro))
    );
    // Si no hay match exacto, relajamos el teclado antes de darla por perdida.
    const relajados =
      candidatos.length > 0
        ? candidatos
        : hermanos.filter(
            (h) =>
              ejeValor(h.ejes, eje) === valor &&
              otrosEjes
                .filter((o) => o !== "teclado")
                .every((otro) => ejeValor(h.ejes, otro) === ejeValor(actual, otro))
          );

    const conStock = relajados.find((c) => c.inStock) ?? relajados[0] ?? null;
    const delta =
      conStock?.precioEfectivo != null && precioActual != null
        ? conStock.precioEfectivo - precioActual
        : null;

    return {
      valor,
      label: meta.label,
      slug: conStock?.slug ?? null,
      disponible: conStock != null,
      agotado: conStock != null && !conStock.inStock,
      delta,
      hex: meta.hex,
      hexSoft: meta.hexSoft,
    };
  });
}
