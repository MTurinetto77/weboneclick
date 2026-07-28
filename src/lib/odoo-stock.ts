/**
 * Verificación de stock en vivo contra Odoo (stock.quant).
 */

import { m2oId, readGroup, type OdooMany2One } from "@/lib/odoo";

export type StockCheckItem = {
  odooProductId: number;
  cantidad: number;
  titulo: string;
};

export type StockShortage = {
  odooProductId: number;
  titulo: string;
  solicitado: number;
  disponible: number;
};

/**
 * Verifica stock en un almacén Odoo concreto.
 * Devuelve ítems con stock insuficiente (vacío = OK).
 */
export async function checkStockOdooWarehouse(
  items: StockCheckItem[],
  warehouseOdooId: number
): Promise<StockShortage[]> {
  const withOdoo = items.filter((i) => i.odooProductId > 0);
  if (!withOdoo.length) return [];

  const odooIds = withOdoo.map((i) => i.odooProductId);
  const availableByProduct = new Map<number, number>();

  for (let i = 0; i < odooIds.length; i += 80) {
    const chunk = odooIds.slice(i, i + 80);
    const groups = await readGroup(
      "stock.quant",
      [
        ["product_id", "in", chunk],
        ["warehouse_id", "=", warehouseOdooId],
        ["location_id.usage", "=", "internal"],
      ],
      ["quantity:sum", "reserved_quantity:sum", "product_id"],
      ["product_id"]
    );

    for (const row of groups) {
      const productOdoo = m2oId(row.product_id as OdooMany2One | false);
      if (!productOdoo) continue;
      const quantity = Number(row.quantity ?? 0);
      const reserved = Number(row.reserved_quantity ?? 0);
      const available = Math.max(0, quantity - reserved);
      availableByProduct.set(
        productOdoo,
        (availableByProduct.get(productOdoo) ?? 0) + available
      );
    }
  }

  const shortages: StockShortage[] = [];
  for (const item of withOdoo) {
    const disponible = availableByProduct.get(item.odooProductId) ?? 0;
    if (disponible < item.cantidad) {
      shortages.push({
        odooProductId: item.odooProductId,
        titulo: item.titulo,
        solicitado: item.cantidad,
        disponible,
      });
    }
  }
  return shortages;
}

export function formatStockShortageMessage(
  shortages: StockShortage[]
): string {
  if (!shortages.length) return "";
  const first = shortages[0]!;
  if (shortages.length === 1) {
    return `Stock insuficiente: ${first.titulo} (disponible: ${first.disponible}, solicitado: ${first.solicitado})`;
  }
  return `Stock insuficiente en ${shortages.length} productos, incluyendo: ${first.titulo}`;
}
