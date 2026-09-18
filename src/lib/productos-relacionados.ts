import { prisma } from "@/lib/prisma";
import {
  getActiveProducts,
  precioEfectivo,
  type ProductListItem,
} from "@/lib/products";
import { uploadPublicUrl } from "@/lib/utils";

/** Tipos de relación producto ↔ producto (cross-sell desde Odoo). */
export const TIPO_RELACION_ACCESORIO = "accesorio" as const;
export const TIPO_RELACION_ALTERNO = "alterno" as const;
export const TIPO_RELACION_OPCIONAL = "opcional" as const;

export type TipoRelacionProducto =
  | typeof TIPO_RELACION_ACCESORIO
  | typeof TIPO_RELACION_ALTERNO
  | typeof TIPO_RELACION_OPCIONAL;

const MAX_RELATED = 8;

export type RelatedProductCard = {
  id_producto: number;
  titulo: string;
  slug: string;
  imagen: string | null;
  precio: number | null;
};

/** IDs de productos relacionados, respetando el orden de la tabla. */
export async function getRelatedProductIds(
  id_producto: number,
  take = MAX_RELATED,
  tipo: TipoRelacionProducto = TIPO_RELACION_ACCESORIO
): Promise<number[]> {
  const relaciones = await prisma.productos_relacionados.findMany({
    where: {
      id_producto,
      tipo_relacion: tipo,
      id_producto_relacionado: { not: id_producto },
    },
    orderBy: { orden: "asc" },
    select: { id_producto_relacionado: true },
    take,
  });
  return relaciones.map((r) => r.id_producto_relacionado);
}

/** Productos activos relacionados para listados (PDP, etc.). */
export async function getRelatedProductsForPdp(
  id_producto: number,
  take = MAX_RELATED
): Promise<ProductListItem[]> {
  const relatedIds = await getRelatedProductIds(id_producto, take);
  if (!relatedIds.length) return [];

  const { items } = await getActiveProducts({
    ids: relatedIds,
    take: Math.min(take, relatedIds.length),
  });
  const byId = new Map(items.map((p) => [p.id_producto, p]));
  return relatedIds
    .map((id) => byId.get(id))
    .filter((p): p is ProductListItem => p != null)
    .slice(0, take);
}

/**
 * Bundle de opcionales para el modal post-ATC:
 * en stock, excluye IDs dados, un producto random por categoría.
 */
export async function getOptionalBundleProducts(
  id_producto: number,
  excludeIds: number[] = []
): Promise<RelatedProductCard[]> {
  const optionalIds = await getRelatedProductIds(
    id_producto,
    50,
    TIPO_RELACION_OPCIONAL
  );
  const exclude = new Set([id_producto, ...excludeIds]);
  const candidateIds = optionalIds.filter((id) => !exclude.has(id));
  if (!candidateIds.length) return [];

  const { items } = await getActiveProducts({
    ids: candidateIds,
    inStockOnly: true,
    take: candidateIds.length,
  });
  if (!items.length) return [];

  const catRows = await prisma.categoria_producto.findMany({
    where: { id_producto: { in: items.map((p) => p.id_producto) } },
    select: { id_producto: true, id_categoria: true },
  });
  /** Primera categoría por producto (convención PDP). */
  const primaryCatByProduct = new Map<number, number>();
  for (const row of catRows) {
    if (!primaryCatByProduct.has(row.id_producto)) {
      primaryCatByProduct.set(row.id_producto, row.id_categoria);
    }
  }

  const byId = new Map(items.map((p) => [p.id_producto, p]));
  /** Preservar orden Odoo; agrupar por categoría. */
  const groups = new Map<string, ProductListItem[]>();
  for (const id of candidateIds) {
    const p = byId.get(id);
    if (!p) continue;
    const catId = primaryCatByProduct.get(p.id_producto);
    const key = catId != null ? `c:${catId}` : `p:${p.id_producto}`;
    const list = groups.get(key);
    if (list) list.push(p);
    else groups.set(key, [p]);
  }

  const picked: ProductListItem[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      picked.push(group[0]);
    } else {
      picked.push(group[Math.floor(Math.random() * group.length)]);
    }
  }

  return picked.map((p) => ({
    id_producto: p.id_producto,
    titulo: p.titulo,
    slug: p.slug,
    imagen: p.imagen ? uploadPublicUrl(p.imagen) : null,
    precio: precioEfectivo(p.precio, p.precio_con_desc),
  }));
}
