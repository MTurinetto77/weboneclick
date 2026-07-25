import { prisma } from "@/lib/prisma";
import { resolveCategoryFilterIds } from "@/lib/products";

export type PromoNavItem = {
  id_promocion: number;
  nombre: string;
  subtitulo: string | null;
  icono: string | null;
  slug: string;
  prioridad: number;
};

export type PromoDetail = {
  id_promocion: number;
  nombre: string;
  subtitulo: string | null;
  icono: string | null;
  etiqueta_imagen: string | null;
  prioridad: number;
  slug: string;
  activo: boolean;
  categorias: { id_categoria: number }[];
  productos: { id_producto: number }[];
};

/** Promociones activas para el mega-menú, ordenadas por prioridad (menor primero). */
export async function getActivePromosNav(): Promise<PromoNavItem[]> {
  return prisma.promocion.findMany({
    where: { activo: true },
    select: {
      id_promocion: true,
      nombre: true,
      subtitulo: true,
      icono: true,
      slug: true,
      prioridad: true,
    },
    orderBy: [{ prioridad: "asc" }, { id_promocion: "asc" }],
  });
}

export async function getPromoBySlug(slug: string): Promise<PromoDetail | null> {
  return prisma.promocion.findFirst({
    where: { slug, activo: true },
    select: {
      id_promocion: true,
      nombre: true,
      subtitulo: true,
      icono: true,
      etiqueta_imagen: true,
      prioridad: true,
      slug: true,
      activo: true,
      categorias: { select: { id_categoria: true } },
      productos: { select: { id_producto: true } },
    },
  });
}

/**
 * Unión de productos asociados directamente + productos de categorías
 * asociadas (incluyendo descendientes).
 */
export async function resolvePromoProductIds(
  promo: Pick<PromoDetail, "productos" | "categorias">
): Promise<number[]> {
  const ids = new Set<number>();

  for (const p of promo.productos) {
    ids.add(p.id_producto);
  }

  for (const c of promo.categorias) {
    const catIds = await resolveCategoryFilterIds(c.id_categoria);
    if (!catIds.length) continue;
    const rows = await prisma.categoria_producto.findMany({
      where: { id_categoria: { in: catIds } },
      select: { id_producto: true },
    });
    for (const r of rows) ids.add(r.id_producto);
  }

  return [...ids];
}

/**
 * Mapa id_producto → etiqueta_imagen de la promo activa con menor prioridad
 * que tenga etiqueta y contenga al producto (directo o por categoría).
 */
export async function getPromoBadges(
  productIds: number[]
): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  if (!productIds.length) return map;

  const promos = await prisma.promocion.findMany({
    where: {
      activo: true,
      etiqueta_imagen: { not: null },
    },
    select: {
      etiqueta_imagen: true,
      prioridad: true,
      productos: { select: { id_producto: true } },
      categorias: { select: { id_categoria: true } },
    },
    orderBy: [{ prioridad: "asc" }, { id_promocion: "asc" }],
  });

  const wanted = new Set(productIds);

  for (const promo of promos) {
    if (!promo.etiqueta_imagen) continue;
    const promoIds = await resolvePromoProductIds(promo);
    for (const id of promoIds) {
      if (wanted.has(id) && !map.has(id)) {
        map.set(id, promo.etiqueta_imagen);
      }
    }
  }

  return map;
}

/** True si el valor de icono parece una ruta de imagen (upload). */
export function isPromoIconImage(icono: string | null | undefined): boolean {
  if (!icono) return false;
  const v = icono.trim();
  if (!v) return false;
  if (v.startsWith("http://") || v.startsWith("https://") || v.startsWith("/")) return true;
  if (/\.(png|jpe?g|webp|gif|svg)$/i.test(v)) return true;
  if (v.includes("/")) return true;
  return false;
}
