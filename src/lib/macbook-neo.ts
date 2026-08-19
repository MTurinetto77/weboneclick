import { prisma } from "@/lib/prisma";
import {
  getActiveProducts,
  precioEfectivo,
  resolveStockAvailability,
  pickCurrentPriceInfo,
  type getProductBySlug,
  type ProductListItem,
} from "@/lib/products";

/**
 * Piloto "MacBook Neo": todo lo que arma la ficha de producto estilo JBL
 * para esa única línea (ver design handoff del 2026-08-17). Solo se activa
 * cuando el producto pertenece a la categoría "macbook-neo" — no toca la
 * base de datos, agrupa/deriva a partir de productos ya existentes (cada
 * combinación de color + almacenamiento es un producto real e independiente
 * en la base, sincronizado desde Odoo).
 */
const MACBOOK_NEO_CATEGORY_SLUG = "macbook-neo";

/** Tokens de color del design handoff (Indigo/Plata/Rosa/Amarillo → nombres reales en el título). */
const COLOR_HEX: Record<string, string> = {
  Indigo: "#5c6178",
  Silver: "#e4e5e7",
  Yellow: "#f3d94f",
  Pink: "#f4d3d6",
};

type Product = NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;

function splitTitleSegments(titulo: string): string[] {
  return titulo
    .split(" - ")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseTitleParts(titulo: string) {
  const segments = splitTitleSegments(titulo);
  const spec = segments[0] ?? titulo;
  const color = segments.slice(1).find((s) => s in COLOR_HEX) ?? null;
  const rest = segments.slice(1).filter((s) => s !== color);
  return { spec, color, rest };
}

/** Quita el último "<n>GB" (almacenamiento) del spec, para poder agrupar por color+storage. */
function stripStorage(spec: string): string {
  const matches = [...spec.matchAll(/\d+GB/g)];
  if (matches.length === 0) return spec;
  const last = matches[matches.length - 1];
  const idx = last.index ?? 0;
  return (spec.slice(0, idx) + spec.slice(idx + last[0].length)).trim();
}

function parseStorage(titulo: string): { id: string; label: string } | null {
  const gb = [...titulo.matchAll(/(\d+)GB/g)].map((m) => m[1]);
  const storage = gb[1] ?? gb[0] ?? null;
  return storage ? { id: storage, label: `${storage}GB` } : null;
}

function parseChip(titulo: string): string {
  const m = titulo.match(/A18(\s+Pro)?\s+(\d+CPU)\s+(\d+GPU)/);
  if (!m) return "A18";
  return `A18${m[1] ?? ""} (${m[2]}/${m[3]})`;
}

function parseChipName(titulo: string): string {
  const m = titulo.match(/A18(\s+Pro)?/);
  return m ? `A18${m[1] ?? ""}` : "A18";
}

function parseCpuGpuCaption(titulo: string): string {
  const m = titulo.match(/(\d+CPU)\s+(\d+GPU)/);
  return m ? `${m[1]} · ${m[2]}` : "";
}

function parseRam(titulo: string): string {
  const gb = [...titulo.matchAll(/(\d+)GB/g)].map((m) => m[1]);
  return gb[0] ? `${gb[0]}GB` : "8GB";
}

export type NeoVariant = {
  id_producto: number;
  slug: string;
  titulo: string;
  color: string;
  colorHex: string;
  storage: string;
  storageLabel: string;
  chip: string;
  ram: string;
  touchId: boolean;
  precio: number | null;
  precioConDesc: number | null;
  porcentajeDesc: number | null;
  ventaEfectiva: number | null;
  inStock: boolean;
  isCurrent: boolean;
};

export type NeoColorOption = { id: string; name: string; hex: string; availableStorages: string[] };
export type NeoStorageOption = { id: string; label: string };

export type NeoPageData = {
  inCategory: boolean;
  displayTitle: string;
  variants: NeoVariant[];
  colors: NeoColorOption[];
  storages: NeoStorageOption[];
  current: NeoVariant | null;
};

const EMPTY_NEO_DATA: NeoPageData = {
  inCategory: false,
  displayTitle: "",
  variants: [],
  colors: [],
  storages: [],
  current: null,
};

export async function getMacbookNeoPageData(
  product: Pick<Product, "id_producto" | "slug" | "titulo" | "categorias">
): Promise<NeoPageData> {
  const inCategory = product.categorias.some(
    (c) => c.categoria.slug === MACBOOK_NEO_CATEGORY_SLUG
  );
  if (!inCategory) return { ...EMPTY_NEO_DATA, displayTitle: product.titulo };

  const { spec, rest } = parseTitleParts(product.titulo);
  // "Touch ID" es un atributo implícito del almacenamiento (viene solo con 512GB
  // en este catálogo), no un eje independiente — se excluye para poder agrupar
  // el mismo teclado/config en las dos capacidades.
  const restKey = rest.filter((r) => r !== "Touch ID").join("|");
  const specBase = stripStorage(spec);

  const siblings = await prisma.producto.findMany({
    where: {
      activo: true,
      categorias: { some: { categoria: { slug: MACBOOK_NEO_CATEGORY_SLUG } } },
      titulo: { startsWith: specBase },
    },
    select: {
      id_producto: true,
      slug: true,
      titulo: true,
      precios: { orderBy: { fecha_desde: "desc" } },
      stocks: { include: { almacen: true } },
    },
  });

  const variants: NeoVariant[] = siblings
    .map((s): NeoVariant | null => {
      const parsed = parseTitleParts(s.titulo);
      const storage = parseStorage(s.titulo);
      if (!parsed.color || !storage) return null;
      const siblingRestKey = parsed.rest.filter((r) => r !== "Touch ID").join("|");
      if (siblingRestKey !== restKey) return null;

      const priceInfo = pickCurrentPriceInfo(s.precios);
      const { inStock } = resolveStockAvailability(s.stocks);

      return {
        id_producto: s.id_producto,
        slug: s.slug,
        titulo: s.titulo,
        color: parsed.color,
        colorHex: COLOR_HEX[parsed.color] ?? "#ccc",
        storage: storage.id,
        storageLabel: storage.label,
        chip: parseChip(s.titulo),
        ram: parseRam(s.titulo),
        touchId: /touch id/i.test(s.titulo),
        precio: priceInfo.precio,
        precioConDesc: priceInfo.precio_con_desc,
        porcentajeDesc: priceInfo.porcentaje_desc,
        ventaEfectiva: precioEfectivo(priceInfo.precio, priceInfo.precio_con_desc),
        inStock,
        isCurrent: s.id_producto === product.id_producto,
      };
    })
    .filter((v): v is NeoVariant => v !== null);

  const colors: NeoColorOption[] = [];
  for (const v of variants) {
    let entry = colors.find((c) => c.id === v.color);
    if (!entry) {
      entry = { id: v.color, name: v.color, hex: v.colorHex, availableStorages: [] };
      colors.push(entry);
    }
    if (!entry.availableStorages.includes(v.storage)) entry.availableStorages.push(v.storage);
  }

  const storages: NeoStorageOption[] = [];
  for (const v of variants) {
    if (!storages.find((s) => s.id === v.storage)) {
      storages.push({ id: v.storage, label: v.storageLabel });
    }
  }
  storages.sort((a, b) => Number(a.id) - Number(b.id));

  const current = variants.find((v) => v.isCurrent) ?? null;

  return {
    inCategory,
    displayTitle: "MacBook Neo",
    variants,
    colors,
    storages,
    current,
  };
}

export function parseSpecChips(titulo: string): string[] {
  const chips: string[] = [];

  const screen = titulo.match(/Neo\s+(\d+)/i);
  if (screen) chips.push(`${screen[1]}"`);

  const chip = titulo.match(/A18(?:\s+Pro)?/);
  if (chip) chips.push(`Chip ${chip[0]}`);

  const gb = [...titulo.matchAll(/(\d+)GB/g)].map((m) => m[1]);
  if (gb.length >= 2) {
    chips.push(`${gb[0]}GB RAM`);
    chips.push(`${gb[1]}GB`);
  } else if (gb.length === 1) {
    chips.push(`${gb[0]}GB`);
  }

  if (/touch id/i.test(titulo)) chips.push("Touch ID");
  if (/english keyboard/i.test(titulo)) chips.push("Teclado en inglés");

  return chips;
}

/** Ficha técnica: dinámico (chip/RAM/almacenamiento/Touch ID/color) + specs de línea (misma para toda la línea). */
export function getMacbookNeoSpecs(variant: NeoVariant): { label: string; value: string }[] {
  return [
    { label: "Chip", value: variant.chip },
    { label: "Memoria RAM", value: variant.ram },
    { label: "Almacenamiento", value: `${variant.storageLabel} SSD` },
    { label: "Pantalla", value: 'Liquid Retina 13", 2560x1600' },
    { label: "Cámara", value: "FaceTime HD 1080p" },
    { label: "Audio", value: "Bocinas duales, Audio Espacial (Dolby Atmos)" },
    { label: "Micrófonos", value: "Sistema de dos micrófonos con beamforming" },
    { label: "Batería", value: "Hasta 15 horas de uso inalámbrico" },
    { label: "Conectividad", value: "2x USB-C, Wi-Fi 6, Bluetooth 5.3" },
    { label: "Touch ID", value: variant.touchId ? "Sí" : "No" },
    { label: "Peso", value: "1.24 kg" },
    { label: "Color", value: variant.color },
  ];
}

export type QuickFact = { value: string; caption: string; icon?: string };

/**
 * Datos rápidos en formato tarjeta (estilo Apple "quick specs"). "3 puertos"
 * está respaldado por la foto real detail-ports-indigo.jpg (2x USB-C +
 * entrada de audífonos visibles en la imagen).
 */
export function getMacbookNeoQuickFacts(variant: NeoVariant): QuickFact[] {
  return [
    { value: parseChipName(variant.titulo), caption: parseCpuGpuCaption(variant.titulo) },
    { value: `${variant.ram} · ${variant.storageLabel}`, caption: "RAM · Almacenamiento" },
    { value: '13"', caption: "Liquid Retina" },
    { value: "15 horas", caption: "de autonomía" },
    {
      value: "Apple Intelligence",
      caption: "incluida",
      icon: "mock/macbook-neo/icon-apple-intelligence.png",
    },
    { value: "3 puertos", caption: "2x USB-C, entrada de audífonos 3.5mm" },
  ];
}

const GALLERY_COLOR_FOLDER: Record<string, string> = {
  Indigo: "indigo",
  Silver: "silver",
  Yellow: "yellow",
  Pink: "pink",
};

const GALLERY_EXTRA_DETAIL_BY_COLOR: Record<string, string> = {
  Indigo: "detail-ports-indigo.jpg",
  Yellow: "detail-keyboard-touchid-yellow.jpg",
};

/** Imágenes adicionales (mock, no vinculadas en BD) para enriquecer la galería. */
export function getMacbookNeoGalleryExtras(color: string | null): string[] {
  const folder = color ? GALLERY_COLOR_FOLDER[color] : undefined;
  if (!folder) return [];

  // Solo ángulos reales del producto (tapa, teclado, detalle). Las fotos de
  // contexto/lifestyle y el gráfico del chip quedan afuera del carrusel —
  // se usan en la sección de Características, y el cliente va a sumar sus
  // propias fotos de contexto más adelante.
  const images = [`mock/macbook-neo/${folder}.jpg`, `mock/macbook-neo/keyboard-${folder}.jpg`];
  const extra = color ? GALLERY_EXTRA_DETAIL_BY_COLOR[color] : undefined;
  if (extra) images.push(`mock/macbook-neo/${extra}`);
  return images;
}

export type ProductFeature = {
  eyebrow: string;
  image: string;
  title: string;
  text: string;
  imageSide: "left" | "right";
};

/**
 * 5 bloques estilo JBL. Se reutilizan las fotos reales ya cargadas para
 * "MacBook Neo" (no hay foto propia de pantalla/cámara/audio en los assets
 * disponibles, así que esos dos bloques se reemplazan por Conectividad y
 * Teclado/Touch ID, que sí tienen foto real).
 */
export function getMacbookNeoFeatures(color: string | null): ProductFeature[] {
  return [
    {
      eyebrow: "Rendimiento",
      image: "mock/macbook-neo/gallery-chip-a18-pro-v3.png",
      title: "Músculo para lo que te mueve",
      text: "El chip A18 Pro entrega la potencia y eficiencia para correr tus apps favoritas, editar fotos y video, y moverte entre tareas sin fricción.",
      imageSide: "left",
    },
    {
      eyebrow: "Teclado",
      image: "mock/macbook-neo/feature-keyboard-detail.png",
      title: "Cómoda, precisa y siempre a mano",
      text: "Un teclado de recorrido completo y un trackpad amplio para que trabajes con precisión — con Touch ID en las configuraciones que lo incluyen.",
      imageSide: "right",
    },
    {
      eyebrow: "Diseño",
      image: "mock/macbook-neo/design-colors-fan-v2.png",
      title: "Colores irresistibles, diseño resistente",
      text: "Elegí entre Indigo, Silver, Pink y Yellow. Un cuerpo compacto y liviano, pensado para acompañarte de la mochila al escritorio sin perder estilo.",
      imageSide: "left",
    },
  ];
}

/** "En la caja" y "Garantía" reales, extraídos de la descripción sincronizada desde Odoo. */
export function extractBoxAndWarranty(descripcionHtml: string): {
  box: string | null;
  warranty: string | null;
} {
  const boxMatch = descripcionHtml.match(
    /En la caja<\/strong><\/p>\s*(?:<p>(?:<br\s*\/?>)?<\/p>\s*)?<ul>([\s\S]*?)<\/ul>/i
  );
  const box = boxMatch ? boxMatch[1].replace(/<[^>]+>/g, "").trim() : null;

  const warrantyMatch = descripcionHtml.match(
    /Garant[ií]a<\/strong><\/p>\s*(?:<p>(?:<br\s*\/?>)?<\/p>\s*)?<p>([\s\S]*?)<\/p>/i
  );
  const warranty = warrantyMatch ? warrantyMatch[1].replace(/<[^>]+>/g, "").trim() : null;

  return { box, warranty };
}

/** MacBook Air 13 M4 real (mismo catálogo), como referencia de comparación. */
export async function getMacbookAirComparison() {
  const air = await prisma.producto.findFirst({
    where: { activo: true, titulo: { startsWith: "MacBook Air 13" } },
    orderBy: { id_producto: "asc" },
    select: { slug: true, titulo: true, precios: { orderBy: { fecha_desde: "desc" } } },
  });
  if (!air) return null;

  const priceInfo = pickCurrentPriceInfo(air.precios);
  const precio = precioEfectivo(priceInfo.precio, priceInfo.precio_con_desc);
  const chipMatch = air.titulo.match(/M4\s+(\d+CPU)\s+(\d+GPU)/);
  const gb = [...air.titulo.matchAll(/(\d+)GB/g)].map((m) => m[1]);

  return {
    slug: air.slug,
    titulo: air.titulo,
    chip: chipMatch ? `M4 (${chipMatch[1]}/${chipMatch[2]})` : "M4",
    ram: gb[0] ? `${gb[0]}GB` : "—",
    storage: gb[1] ? `${gb[1]}GB` : "—",
    screen: '13.6" Liquid Retina',
    precio,
  };
}

/** Accesorios reales curados para "Completá tu MacBook Neo" (piloto, un solo producto). */
const ACCESSORY_SLUGS = [
  "bfgom1314-bk-funda-tucano-gommo-macbook-pro-14-negro",
  "mw2k3le-a-cargador-dual-apple-usb-c-35w",
  "mw493am-a-cable-de-carga-apple-60w-usb-c-1m",
  "mxk53am-a-apple-magic-mouse",
];

/** Accesorios reales para "Completá tu MacBook Neo", con la misma data que usa ProductCard (precio, cuotas, stock, wishlist). */
export async function getMacbookNeoAccessories(): Promise<ProductListItem[]> {
  const ids = await prisma.producto.findMany({
    where: { activo: true, slug: { in: ACCESSORY_SLUGS } },
    select: { id_producto: true, slug: true },
  });

  const bySlug = new Map(ids.map((i) => [i.slug, i.id_producto]));
  const orderedIds = ACCESSORY_SLUGS.map((slug) => bySlug.get(slug)).filter(
    (id): id is number => id != null
  );
  if (orderedIds.length === 0) return [];

  const { items } = await getActiveProducts({ ids: orderedIds });
  const byId = new Map(items.map((i) => [i.id_producto, i]));
  return orderedIds.map((id) => byId.get(id)).filter((i): i is ProductListItem => i != null);
}
