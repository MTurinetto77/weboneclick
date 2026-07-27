import type { PaymentResponse } from "mercadopago/dist/clients/payment/commonTypes";
import { deductStock } from "@/lib/cart";
import { releaseCuponForVenta } from "@/lib/cupones";
import { prisma } from "@/lib/prisma";

export type MpSyncResult = "approved" | "pending" | "rejected" | "ignored";

/**
 * Aplica el resultado de un pago de Mercado Pago sobre la venta local:
 * valida el monto, actualiza estados y descuenta stock solo al aprobarse.
 * Es idempotente: un pago ya aprobado no vuelve a descontar stock.
 */
export async function applyMercadoPagoPayment(
  payment: PaymentResponse
): Promise<MpSyncResult> {
  const idVenta = Number(payment.external_reference);
  if (!Number.isInteger(idVenta) || idVenta <= 0) return "ignored";

  const venta = await prisma.venta.findUnique({
    where: { id_venta: idVenta },
    include: { detalles: true },
  });
  if (!venta) return "ignored";

  const amount = Number(payment.transaction_amount ?? 0);
  if (Math.abs(Number(venta.total) - amount) > 0.01) {
    throw new Error(`Monto inválido para la venta ${idVenta}`);
  }

  const status = payment.status ?? "pending";
  const transactionId = String(payment.id ?? "");

  if (status === "approved") {
    await prisma.$transaction(async (tx) => {
      const pago = await tx.pago.findFirst({
        where: {
          id_venta: idVenta,
          tipo_pago: { in: ["mercado_pago", "tarjeta"] },
        },
      });
      if (!pago || pago.estado === "aprobado") return;

      for (const item of venta.detalles) {
        const cantidad = Number(item.cantidad);
        const stocks = await tx.stock.findMany({
          where: { id_producto: item.id_producto },
        });
        if (stocks.length === 0) continue;
        const disponible = stocks.reduce((sum, row) => sum + Number(row.cantidad), 0);
        if (disponible < cantidad) {
          throw new Error(`Stock insuficiente: ${item.nombre_producto}`);
        }
        await deductStock(tx, item.id_producto, cantidad);
      }

      await tx.pago.update({
        where: { id_pago: pago.id_pago },
        data: { estado: "aprobado", transaction_id: transactionId },
      });
      await tx.venta.update({
        where: { id_venta: idVenta },
        data: { estado: "pagada" },
      });
    });
    return "approved";
  }

  const rejected = status === "rejected" || status === "cancelled";
  await prisma.pago.updateMany({
    where: { id_venta: idVenta, tipo_pago: { in: ["mercado_pago", "tarjeta"] } },
    data: {
      estado: rejected ? "rechazado" : "pendiente",
      transaction_id: transactionId || null,
    },
  });
  if (rejected) {
    await prisma.venta.update({
      where: { id_venta: idVenta },
      data: { estado: "cancelada" },
    });
    await releaseCuponForVenta(idVenta);
  }
  return rejected ? "rejected" : "pending";
}
