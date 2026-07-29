import type { PaymentResponse } from "mercadopago/dist/clients/payment/commonTypes";
import { deductStock } from "@/lib/cart";
import { releaseCuponForVenta } from "@/lib/cupones";
import { syncVentaToOdoo } from "@/lib/odoo-venta";
import { prisma } from "@/lib/prisma";

export type MpSyncResult = "approved" | "pending" | "rejected" | "ignored";

/**
 * Aplica el resultado de un pago de Mercado Pago sobre la venta local:
 * valida el monto, actualiza estados y descuenta stock solo al aprobarse.
 * Es idempotente bajo concurrencia: el claim atómico de pago evita doble descuento.
 */
export async function applyMercadoPagoPayment(
  payment: PaymentResponse,
  options?: { syncOdoo?: boolean },
): Promise<MpSyncResult> {
  const idVenta = Number(payment.external_reference);
  if (!Number.isInteger(idVenta) || idVenta <= 0) return "ignored";

  const venta = await prisma.venta.findUnique({
    where: { id_venta: idVenta },
    include: { detalles: true, envios: true },
  });
  if (!venta) return "ignored";

  // Si ya está pagada, no degradar ni reprocesar.
  if (venta.estado === "pagada") return "approved";

  const amount = Number(payment.transaction_amount ?? 0);
  if (Math.abs(Number(venta.total) - amount) > 0.01) {
    throw new Error(`Monto inválido para la venta ${idVenta}`);
  }

  const status = payment.status ?? "pending";
  const transactionId = String(payment.id ?? "");

  if (status === "approved") {
    let shouldSyncOdoo = false;

    await prisma.$transaction(async (tx) => {
      // Claim atómico: solo un worker gana si el pago aún no está aprobado.
      const claimed = await tx.pago.updateMany({
        where: {
          id_venta: idVenta,
          tipo_pago: { in: ["mercado_pago", "tarjeta"] },
          estado: { not: "aprobado" },
        },
        data: {
          estado: "aprobado",
          transaction_id: transactionId || null,
        },
      });
      if (claimed.count === 0) return;

      const warehouseOdooId = venta.odoo_warehouse_id;
      if (!warehouseOdooId) {
        throw new Error(`Venta ${idVenta} sin almacén Odoo asignado`);
      }

      for (const item of venta.detalles) {
        const cantidad = Number(item.cantidad);
        const stocks = await tx.stock.findMany({
          where: {
            id_producto: item.id_producto,
            almacen: { odoo_id: warehouseOdooId },
          },
        });
        if (stocks.length === 0) continue;
        const disponible = stocks.reduce(
          (sum, row) => sum + Number(row.cantidad),
          0,
        );
        if (disponible < cantidad) {
          throw new Error(`Stock insuficiente: ${item.nombre_producto}`);
        }
        await deductStock(tx, item.id_producto, cantidad, warehouseOdooId);
      }

      await tx.venta.update({
        where: { id_venta: idVenta },
        data: { estado: "pagada" },
      });

      if (venta.envios.length > 0) {
        await tx.envio.updateMany({
          where: { id_venta: idVenta },
          data: { estado: "confirmado" },
        });
      }

      shouldSyncOdoo = true;
    });

    if (shouldSyncOdoo && options?.syncOdoo !== false) {
      syncVentaToOdoo(idVenta).catch((err) => {
        console.error(`Odoo sync failed for venta ${idVenta}:`, err);
      });
    }

    return "approved";
  }

  const rejected = status === "rejected" || status === "cancelled";

  // Nunca degradar un pago ya aprobado (p. ej. notificación tardía rejected).
  const updated = await prisma.pago.updateMany({
    where: {
      id_venta: idVenta,
      tipo_pago: { in: ["mercado_pago", "tarjeta"] },
      estado: { not: "aprobado" },
    },
    data: {
      estado: rejected ? "rechazado" : "pendiente",
      transaction_id: transactionId || null,
    },
  });

  if (rejected && updated.count > 0) {
    const ventaStill = await prisma.venta.findUnique({
      where: { id_venta: idVenta },
      select: { estado: true },
    });
    if (ventaStill && ventaStill.estado !== "pagada") {
      await prisma.venta.update({
        where: { id_venta: idVenta },
        data: { estado: "cancelada" },
      });
      await releaseCuponForVenta(idVenta);
    }
  }

  return rejected ? "rejected" : "pending";
}
