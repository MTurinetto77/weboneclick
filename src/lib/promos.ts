import type { Prisma } from "@prisma/client";
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
  por_cuotas: boolean;
  cuotas: number | null;
  categorias: { id_categoria: number }[];
  productos: { id_producto: number }[];
};

/**
 * Promo publicada: `activo` y dentro de la vigencia. Cada extremo vacío deja la
 * ventana abierta de ese lado, así las promos sin fechas siguen como antes.
 */
export function promoVigenteWhere(now = new Date()): Prisma.promocionWhereInput {
  return {
    activo: true,
    AND: [
      { OR: [{ vigencia_desde: null }, { vigencia_desde: { lte: now } }] },
      { OR: [{ vigencia_hasta: null }, { vigencia_hasta: { gte: now } }] },
    ],
  };
}

export type PromoEstado = "inactiva" | "programada" | "vigente" | "vencida";

/** Mismo criterio que `promoVigenteWhere`, para mostrar el estado en el admin. */
export function promoEstado(
  promo: { activo: boolean; vigencia_desde: Date | null; vigencia_hasta: Date | null },
  now = new Date()
): PromoEstado {
  if (!promo.activo) return "inactiva";
  if (promo.vigencia_desde && promo.vigencia_desde > now) return "programada";
  if (promo.vigencia_hasta && promo.vigencia_hasta < now) return "vencida";
  return "vigente";
}

/** Valor para `<input type="datetime-local">`. */
export function toDatetimeLocal(d: Date | null) {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Promociones activas para el mega-menú, ordenadas por prioridad (menor primero). */
export async function getActivePromosNav(): Promise<PromoNavItem[]> {
  return prisma.promocion.findMany({
    where: promoVigenteWhere(),
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
    where: { slug, ...promoVigenteWhere() },
    select: {
      id_promocion: true,
      nombre: true,
      subtitulo: true,
      icono: true,
      etiqueta_imagen: true,
      prioridad: true,
      slug: true,
      activo: true,
      por_cuotas: true,
      cuotas: true,
      categorias: { select: { id_categoria: true } },
      productos: { select: { id_producto: true } },
    },
  });
}

/**
 * Productos de la promo:
 * - Si por_cuotas: todos los activos con cuotas_max = cuotas.
 * - Si no: unión de lista manual + categorías asociadas (con descendientes).
 */
export async function resolvePromoProductIds(
  promo: Pick<PromoDetail, "productos" | "categorias" | "por_cuotas" | "cuotas">
): Promise<number[]> {
  if (promo.por_cuotas) {
    if (promo.cuotas == null || !Number.isFinite(promo.cuotas) || promo.cuotas <= 0) {
      return [];
    }
    const rows = await prisma.producto.findMany({
      where: { activo: true, cuotas_max: promo.cuotas },
      select: { id_producto: true },
    });
    return rows.map((r) => r.id_producto);
  }

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
 * Mapa id_producto → imagen de badge para la card.
 * Primero la etiqueta web manual activa de menor prioridad; si no tiene,
 * la etiqueta_imagen de la promo activa de menor prioridad que contenga
 * al producto (directo, por categoría o por cuotas).
 */
export async function getPromoBadges(
  productIds: number[]
): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  if (!productIds.length) return map;

  const etiquetas = await prisma.etiqueta_web_producto.findMany({
    where: {
      id_producto: { in: productIds },
      etiqueta: { activo: true, imagen: { not: null } },
    },
    select: {
      id_producto: true,
      etiqueta: { select: { imagen: true } },
    },
    orderBy: [
      { etiqueta: { prioridad: "asc" } },
      { id_etiqueta_web: "asc" },
    ],
  });
  for (const row of etiquetas) {
    if (row.etiqueta.imagen && !map.has(row.id_producto)) {
      map.set(row.id_producto, row.etiqueta.imagen);
    }
  }
  if (map.size === productIds.length) return map;

  const promos = await prisma.promocion.findMany({
    where: {
      ...promoVigenteWhere(),
      etiqueta_imagen: { not: null },
    },
    select: {
      etiqueta_imagen: true,
      prioridad: true,
      por_cuotas: true,
      cuotas: true,
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
