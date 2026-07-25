/** Ubicaciones administrables de banners en la home. */
export const BANNER_UBICACIONES = [
  {
    value: "hero",
    label: "Hero (arriba de todo)",
    sizeHint: "~1200×560 px (ocupa el 62% derecho; degradado oscuro a la izquierda)",
  },
  {
    value: "secundario",
    label: "Secundario horizontal (bajo el hero)",
    sizeHint: "~1480×160 px (alto visible mínimo 112 px)",
  },
  {
    value: "triple",
    label: "Triple (3 tarjetas iguales)",
    sizeHint: "~940×430 px (se muestra a ~470×214; usar orden 1, 2 y 3)",
  },
  {
    value: "pie",
    label: "Pie (último banner de la página)",
    sizeHint: "~1480×220 px (alto visible mínimo 190 px)",
  },
] as const;

export type BannerUbicacion = (typeof BANNER_UBICACIONES)[number]["value"];

export function isBannerUbicacion(value: string): value is BannerUbicacion {
  return BANNER_UBICACIONES.some((u) => u.value === value);
}

export function bannerSizeHint(ubicacion: string) {
  return BANNER_UBICACIONES.find((u) => u.value === ubicacion)?.sizeHint ?? null;
}

/**
 * Resuelve la URL pública de una imagen de banner.
 * Rutas absolutas (/oneclick/…) y http(s) se usan tal cual;
 * rutas relativas de upload (banners/uuid.jpg) pasan por /api/uploads.
 */
export function bannerImageUrl(link: string | null | undefined): string {
  if (!link) return "";
  if (link.startsWith("http://") || link.startsWith("https://") || link.startsWith("/")) {
    return link;
  }
  const base = (process.env.NEXT_PUBLIC_UPLOADS_BASE_URL || "/api/uploads").replace(/\/+$/, "");
  return `${base}/${link.replace(/^\/+/, "")}`;
}
