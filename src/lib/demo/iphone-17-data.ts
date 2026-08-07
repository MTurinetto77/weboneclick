/** Datos hardcodeados para la demo PDP de variantes iPhone 17. */

const UPLOADS = "https://oneclickstore.com/api/uploads";

export const IPHONE_17_CAPACITIES = ["256 GB", "512 GB"] as const;
export type Iphone17Capacity = (typeof IPHONE_17_CAPACITIES)[number];

export const IPHONE_17_COLORS = [
  { id: "negro", label: "Negro", hex: "#1d1d1f" },
  { id: "blanco", label: "Blanco", hex: "#f5f5f7" },
  { id: "lavanda", label: "Lavanda", hex: "#c8b8d8" },
  { id: "verde-salvia", label: "Verde Salvia", hex: "#a8b5a0" },
  { id: "azul-neblina", label: "Azul Neblina", hex: "#a8c5d4" },
] as const;

export type Iphone17ColorId = (typeof IPHONE_17_COLORS)[number]["id"];

export const IPHONE_17_CUOTA_OPTIONS = [
  { id: "contado", label: "Contado", installments: 0 as const },
  { id: "3", label: "3 cuotas", installments: 3 as const },
  { id: "6", label: "6 cuotas", installments: 6 as const },
  { id: "12", label: "12 cuotas", installments: 12 as const },
] as const;

export type Iphone17CuotaId = (typeof IPHONE_17_CUOTA_OPTIONS)[number]["id"];

const PRICE_BY_CAPACITY: Record<Iphone17Capacity, number> = {
  "256 GB": 2_694_999,
  "512 GB": 3_674_999,
};

/** Imagen principal por color (mismas fotos para 256 y 512 salvo Lavanda 512). */
const IMAGE_BY_COLOR: Record<Iphone17ColorId, string[]> = {
  negro: [`${UPLOADS}/productos/57267/3dc153aa53.jpg`],
  blanco: [`${UPLOADS}/productos/57268/35be6ef719.jpg`],
  lavanda: [`${UPLOADS}/productos/58619/edfdefa6d3.jpg`],
  "verde-salvia": [`${UPLOADS}/productos/58621/8d1c43f364.jpg`],
  "azul-neblina": [`${UPLOADS}/productos/57269/c4f7aced39.jpg`],
};

const LAVANDA_512_IMAGES = [`${UPLOADS}/productos/58620/b5632d8df0.jpg`];

export type Iphone17Variant = {
  capacity: Iphone17Capacity;
  colorId: Iphone17ColorId;
  price: number;
  images: string[];
  inStock: boolean;
};

function buildVariants(): Iphone17Variant[] {
  const variants: Iphone17Variant[] = [];
  for (const capacity of IPHONE_17_CAPACITIES) {
    for (const color of IPHONE_17_COLORS) {
      const images =
        capacity === "512 GB" && color.id === "lavanda"
          ? LAVANDA_512_IMAGES
          : IMAGE_BY_COLOR[color.id];
      variants.push({
        capacity,
        colorId: color.id,
        price: PRICE_BY_CAPACITY[capacity],
        images,
        // Como en prod: Lavanda 256 GB sin stock
        inStock: !(capacity === "256 GB" && color.id === "lavanda"),
      });
    }
  }
  return variants;
}

export const IPHONE_17_VARIANTS = buildVariants();

export function findIphone17Variant(
  capacity: Iphone17Capacity,
  colorId: Iphone17ColorId
): Iphone17Variant {
  return (
    IPHONE_17_VARIANTS.find((v) => v.capacity === capacity && v.colorId === colorId) ??
    IPHONE_17_VARIANTS[0]
  );
}

export function getIphone17ColorLabel(colorId: Iphone17ColorId): string {
  return IPHONE_17_COLORS.find((c) => c.id === colorId)?.label ?? colorId;
}
