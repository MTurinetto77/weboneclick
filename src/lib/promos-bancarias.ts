/** Promociones bancarias vigentes (oneclickstore.com/ocbeneficios + /beneficio/...) */

export type PromoBancaria = {
  cuotas: number;
  titulo: string;
  subtitulo: string;
  disponibleEn: string;
  slug: string;
  vigenciaDesde: string; // ISO date YYYY-MM-DD
  vigenciaHasta: string;
  detalles?: string;
  legales?: string;
  tarjetas: Array<"mastercard" | "visa" | "mercadopago">;
};

export const PROMOCIONES_BANCARIAS: PromoBancaria[] = [
  {
    cuotas: 24,
    titulo: "24 Cuotas Sin Interes",
    subtitulo: "CON TODAS LAS TARJETAS Y BANCOS - CUOTAS",
    disponibleEn:
      "Tienda Online (Web), Tienda Palermo Soho, Tienda Solar Shopping, Tienda Cordoba Shopping, Tienda Alto Rosario, Tienda Rosario Centro",
    slug: "24-cuotas-sin-interes",
    vigenciaDesde: "2026-05-11",
    vigenciaHasta: "2026-05-17",
    detalles:
      "Promoción de hasta 24 cuotas sin interés con todas las tarjetas y bancos habilitados, en productos seleccionados.",
    legales: "Sujeto a bases y condiciones. Consultá vigencia y productos alcanzados en tienda y web.",
    tarjetas: ["mastercard", "visa", "mercadopago"],
  },
  {
    cuotas: 18,
    titulo: "18 cuotas sin interés",
    subtitulo: "CON TODAS LAS TARJETAS Y BANCOS - CUOTAS",
    disponibleEn:
      "Tienda Online (Web), Tienda Palermo Soho, Tienda DOT Baires, Tienda Cordoba Shopping, Tienda Alto Rosario, Tienda Rosario Centro",
    slug: "18-cuotas-sin-interes",
    vigenciaDesde: "2026-01-01",
    vigenciaHasta: "2026-12-31",
    detalles:
      "Promoción de hasta 18 cuotas sin interés con todas las tarjetas y bancos habilitados, en productos seleccionados.",
    legales: "Sujeto a bases y condiciones vigentes en www.oneclickstore.com/bases-y-condiciones",
    tarjetas: ["mastercard", "visa", "mercadopago"],
  },
  {
    cuotas: 12,
    titulo: "12 cuotas sin interés",
    subtitulo: "CON TODAS LAS TARJETAS Y BANCOS - CUOTAS",
    disponibleEn:
      "Tienda Online (Web), Tienda Palermo Soho, Tienda Solar Shopping, Tienda DOT Baires, Tienda Cordoba Shopping, Tienda Alto Rosario, Tienda Rosario Centro",
    slug: "12-cuotas-sin-interes",
    vigenciaDesde: "2026-01-01",
    vigenciaHasta: "2026-12-31",
    detalles:
      "Promoción de hasta 12 cuotas sin interés con todas las tarjetas y bancos habilitados, en productos seleccionados.",
    legales: "Sujeto a bases y condiciones vigentes en www.oneclickstore.com/bases-y-condiciones",
    tarjetas: ["mastercard", "visa", "mercadopago"],
  },
  {
    cuotas: 9,
    titulo: "9 Cuotas sin interés",
    subtitulo: "CON TODAS LAS TARJETAS Y BANCOS - CUOTAS",
    disponibleEn:
      "Tienda Online (Web), Tienda Palermo Soho, Tienda Solar Shopping, Tienda DOT Baires, Tienda Cordoba Shopping, Tienda Alto Rosario, Tienda Rosario Centro",
    slug: "9-cuotas-sin-interes",
    vigenciaDesde: "2026-01-01",
    vigenciaHasta: "2026-12-31",
    detalles:
      "Promoción de hasta 9 cuotas sin interés con todas las tarjetas y bancos habilitados, en productos seleccionados.",
    legales: "Sujeto a bases y condiciones vigentes en www.oneclickstore.com/bases-y-condiciones",
    tarjetas: ["mastercard", "visa", "mercadopago"],
  },
  {
    cuotas: 6,
    titulo: "6 cuotas sin interés",
    subtitulo: "CON TODAS LAS TARJETAS Y BANCOS - CUOTAS",
    disponibleEn:
      "Tienda Online (Web), Tienda Palermo Soho, Tienda Solar Shopping, Tienda DOT Baires, Tienda Cordoba Shopping, Tienda Alto Rosario, Tienda Rosario Centro",
    slug: "6-cuotas-sin-interes",
    vigenciaDesde: "2026-01-01",
    vigenciaHasta: "2026-12-31",
    detalles:
      "Promoción de hasta 6 cuotas sin interés con todas las tarjetas y bancos habilitados, en productos seleccionados.",
    legales: "Sujeto a bases y condiciones vigentes en www.oneclickstore.com/bases-y-condiciones",
    tarjetas: ["mastercard", "visa", "mercadopago"],
  },
  {
    cuotas: 3,
    titulo: "3 Cuotas sin interés",
    subtitulo: "CON TODAS LAS TARJETAS Y BANCOS - CUOTAS",
    disponibleEn:
      "Tienda Online (Web), Tienda Palermo Soho, Tienda Solar Shopping, Tienda DOT Baires, Tienda Cordoba Shopping, Tienda Alto Rosario, Tienda Rosario Centro",
    slug: "3-cuotas-sin-interes",
    vigenciaDesde: "2026-01-01",
    vigenciaHasta: "2026-12-31",
    detalles:
      "Promoción de hasta 3 cuotas sin interés con todas las tarjetas y bancos habilitados, en productos seleccionados.",
    legales: "Sujeto a bases y condiciones vigentes en www.oneclickstore.com/bases-y-condiciones",
    tarjetas: ["mastercard", "visa", "mercadopago"],
  },
];

export const PROMO_CARD_LOGOS: Record<
  PromoBancaria["tarjetas"][number],
  { src: string; alt: string }
> = {
  mastercard: { src: "/oneclick/pages/mastercard.png", alt: "Mastercard" },
  visa: { src: "/oneclick/pages/visa.png", alt: "Visa" },
  mercadopago: { src: "/oneclick/pages/mercadopago.png", alt: "Mercado Pago" },
};

export function getPromoBySlug(slug: string) {
  return PROMOCIONES_BANCARIAS.find((p) => p.slug === slug) ?? null;
}

export function formatPromoDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
