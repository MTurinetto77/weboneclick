import { prisma } from "@/lib/prisma";
import { getActiveProducts, type ProductListItem } from "@/lib/products";
import {
  DESTACADOS_PESTANAS,
  type DestacadosPestana,
  type HomeSeccionClave,
} from "@/lib/secciones-constants";

export type { DestacadosPestana, HomeSeccionClave };
export { DESTACADOS_PESTANAS };
export type HomeSeccionResult = {
  id_seccion: number;
  clave: string;
  nombre: string;
  productos: ProductListItem[];
  /** Solo presente para destacados */
  porPestana?: Record<DestacadosPestana, ProductListItem[]>;
};

async function loadProductsOrdered(
  id_seccion: number,
  pestana: string
): Promise<ProductListItem[]> {
  const links = await prisma.seccion_producto.findMany({
    where: { id_seccion, pestana },
    orderBy: { orden: "asc" },
    select: { id_producto: true, orden: true },
  });
  if (!links.length) return [];

  const ids = links.map((l) => l.id_producto);
  const orderMap = new Map(links.map((l) => [l.id_producto, l.orden]));
  const { items } = await getActiveProducts({ ids, take: ids.length });

  return [...items].sort(
    (a, b) =>
      (orderMap.get(a.id_producto) ?? 0) - (orderMap.get(b.id_producto) ?? 0)
  );
}

/**
 * Carga una sección de home por clave.
 * Retorna null si no existe o está inactiva.
 */
export async function getHomeSeccion(
  clave: HomeSeccionClave
): Promise<HomeSeccionResult | null> {
  const seccion = await prisma.seccion.findUnique({
    where: { clave },
  });
  if (!seccion || !seccion.activo) return null;

  if (clave === "destacados") {
    const [apple, jbl, accesorios] = await Promise.all([
      loadProductsOrdered(seccion.id_seccion, "apple"),
      loadProductsOrdered(seccion.id_seccion, "jbl"),
      loadProductsOrdered(seccion.id_seccion, "accesorios"),
    ]);
    return {
      id_seccion: seccion.id_seccion,
      clave: seccion.clave,
      nombre: seccion.nombre,
      productos: [...apple, ...jbl, ...accesorios],
      porPestana: { apple, jbl, accesorios },
    };
  }

  const productos = await loadProductsOrdered(seccion.id_seccion, "");
  return {
    id_seccion: seccion.id_seccion,
    clave: seccion.clave,
    nombre: seccion.nombre,
    productos,
  };
}

/** IDs de productos visibles en secciones activas de la home (sync imágenes Odoo). */
export async function getHomeSeccionProductIds(): Promise<number[]> {
  const secciones = await prisma.seccion.findMany({
    where: { activo: true },
    select: {
      productos: { select: { id_producto: true } },
    },
  });
  const ids = new Set<number>();
  for (const s of secciones) {
    for (const p of s.productos) ids.add(p.id_producto);
  }
  return [...ids];
}
