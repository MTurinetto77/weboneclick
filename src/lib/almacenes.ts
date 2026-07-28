/**
 * Almacenes Odoo vendibles en la web (configuración en tabla `almacen`).
 * - Retiro: almacenes con `id_tienda` (sucursal de retiro)
 * - Envío: almacén con `es_envio_domicilio = true` (WH/Stock)
 */

import { prisma } from "@/lib/prisma";

export const ALMACEN_WEB_SELECT = {
  odoo_id: true,
  id_tienda: true,
  es_envio_domicilio: true,
} as const;

export type AlmacenWebRef = {
  odoo_id: number | null;
  id_tienda?: number | null;
  es_envio_domicilio?: boolean;
};

export type StockRow = {
  cantidad: unknown;
  almacen?: AlmacenWebRef | null;
};

/** Almacén de retiro en tienda (tiene tienda asociada). */
export function isStoreWarehouse(almacen?: AlmacenWebRef | null): boolean {
  return almacen?.odoo_id != null && almacen.id_tienda != null;
}

/** Almacén de envío a domicilio. */
export function isShippingWarehouse(almacen?: AlmacenWebRef | null): boolean {
  return Boolean(almacen?.odoo_id && almacen.es_envio_domicilio);
}

/** Stock que cuenta para disponibilidad web. */
export function isSellableAlmacen(almacen?: AlmacenWebRef | null): boolean {
  return isStoreWarehouse(almacen) || isShippingWarehouse(almacen);
}

/** Suma stock solo de almacenes vendibles. */
export function sumSellableStock(stocks: StockRow[]): number {
  return stocks
    .filter((s) => isSellableAlmacen(s.almacen))
    .reduce((acc, s) => acc + Number(s.cantidad || 0), 0);
}

/** Stock por odoo_id de almacén (solo vendibles). */
export function stockByWarehouseOdooId(
  stocks: StockRow[]
): Map<number, number> {
  const map = new Map<number, number>();
  for (const s of stocks) {
    const wh = s.almacen?.odoo_id;
    if (wh == null || !isSellableAlmacen(s.almacen)) continue;
    map.set(wh, (map.get(wh) ?? 0) + Number(s.cantidad || 0));
  }
  return map;
}

/** odoo_id del almacén de envío a domicilio (es_envio_domicilio). */
export async function getShippingWarehouseOdooId(): Promise<number> {
  const almacen = await prisma.almacen.findFirst({
    where: { es_envio_domicilio: true, odoo_id: { not: null } },
    select: { odoo_id: true },
  });
  if (!almacen?.odoo_id) {
    throw new Error(
      "No hay almacén de envío a domicilio configurado (es_envio_domicilio)"
    );
  }
  return almacen.odoo_id;
}

/** odoo_ids de almacenes de retiro en tienda (con id_tienda). */
export async function getStoreWarehouseOdooIds(): Promise<number[]> {
  const rows = await prisma.almacen.findMany({
    where: { id_tienda: { not: null }, odoo_id: { not: null } },
    select: { odoo_id: true },
    orderBy: { id_almacen: "asc" },
  });
  return rows.map((r) => r.odoo_id!);
}

/** odoo_ids de todos los almacenes vendibles en la web. */
export async function getSellableWarehouseOdooIds(): Promise<number[]> {
  const rows = await prisma.almacen.findMany({
    where: {
      odoo_id: { not: null },
      OR: [{ id_tienda: { not: null } }, { es_envio_domicilio: true }],
    },
    select: { odoo_id: true },
    orderBy: { id_almacen: "asc" },
  });
  return rows.map((r) => r.odoo_id!);
}
