import type { PaymentResponse } from "mercadopago/dist/clients/payment/commonTypes";
import { deductStock } from "@/lib/cart";
import { releaseCuponForVenta } from "@/lib/cupones";
import { sendOrderConfirmationEmail } from "@/lib/order-mail";
import { syncVentaToOdoo } from "@/lib/odoo-venta";
import { prisma } from "@/lib/prisma";

export type MpSyncResult = "approved" | "pending" | "rejected" | "ignored";

const MP_TIPOS = ["mercado_pago", "tarjeta"] as const;

function money(n: number | string | { toString(): string } | null | undefined) {
  return Number(n ?? 0);
}

function almostEqual(a: number, b: number, tol = 0.01) {
  return Math.abs(a - b) <= tol;
}

/**
 * Aplica el resultado de un pago de Mercado Pago sobre la venta local.
 * Soporta pago con una o dos tarjetas: cada notification puede traer un
 * parcial; la venta pasa a pagada recién cuando la suma de pagos aprobados
 * cubre el total. Idempotente por transaction_id.
 */
export async function applyMercadoPagoPayment(
  payment: PaymentResponse,
  options?: { syncOdoo?: boolean },
): Promise<MpSyncResult> {
  const idVenta = Number(payment.external_reference);
  if (!Number.isInteger(idVenta) || idVenta <= 0) return "ignored";

  const venta = await prisma.venta.findUnique({
    where: { id_venta: idVenta },
    include: { detalles: true, envios: true, pagos: true },
  });
  if (!venta) return "ignored";

  if (venta.estado === "pagada") return "approved";

  const amount = money(payment.transaction_amount);
  const total = money(venta.total);
  if (!(amount > 0)) {
    throw new Error(`Monto MP inválido para la venta ${idVenta}`);
  }
  // Un parcial no puede superar el total de la venta (margen de redondeo).
  if (amount > total + 0.01) {
    const motivo = `MP monto inválido: cobrado ${amount} vs venta ${total}`;
    await prisma.venta
      .update({
        where: { id_venta: idVenta },
        data: { odoo_sync_error: motivo },
      })
      .catch(() => undefined);
    throw new Error(`Monto inválido para la venta ${idVenta}`);
  }

  const status = payment.status ?? "pending";
  const transactionId = String(payment.id ?? "").trim();
  if (!transactionId) return "ignored";

  const statusDetail = payment.status_detail?.trim() || null;
  const tipoPago =
    venta.pagos.find((p) => MP_TIPOS.includes(p.tipo_pago as (typeof MP_TIPOS)[number]))
      ?.tipo_pago ?? "mercado_pago";

  if (status === "approved") {
    let shouldSyncOdoo = false;
    let covered = false;

    await prisma.$transaction(async (tx) => {
      const already = await tx.pago.findUnique({
        where: { transaction_id: transactionId },
      });

      if (!already) {
        const fullAmount = almostEqual(amount, total);
        const shell = await tx.pago.findFirst({
          where: {
            id_venta: idVenta,
            tipo_pago: { in: [...MP_TIPOS] },
            transaction_id: null,
            estado: { not: "aprobado" },
          },
          orderBy: { id_pago: "asc" },
        });

        if (shell && fullAmount) {
          // Un solo pago por el total: reutiliza la fila creada en checkout.
          await tx.pago.update({
            where: { id_pago: shell.id_pago },
            data: {
              estado: "aprobado",
              monto: amount,
              transaction_id: transactionId,
            },
          });
        } else {
          // Parcial (p. ej. 2 tarjetas) u otra captura: nueva fila.
          // Conserva la shell con preference id en `referencia`.
          await tx.pago.create({
            data: {
              id_venta: idVenta,
              tipo_pago: tipoPago,
              estado: "aprobado",
              monto: amount,
              transaction_id: transactionId,
              referencia: null,
            },
          });
        }
      } else if (already.estado !== "aprobado") {
        await tx.pago.update({
          where: { id_pago: already.id_pago },
          data: { estado: "aprobado", monto: amount },
        });
      }

      const aprobados = await tx.pago.findMany({
        where: {
          id_venta: idVenta,
          tipo_pago: { in: [...MP_TIPOS] },
          estado: "aprobado",
        },
      });
      const sumApproved = aprobados.reduce((s, p) => s + money(p.monto), 0);

      if (sumApproved + 0.01 < total) {
        // Aún faltan parciales (segunda tarjeta, etc.).
        await tx.venta.update({
          where: { id_venta: idVenta },
          data: {
            odoo_sync_error: `MP parcial: acreditado ${sumApproved.toFixed(2)} / ${total.toFixed(2)}`,
          },
        });
        return;
      }

      // Claim atómico de la venta: un solo worker descuenta stock.
      const claimed = await tx.venta.updateMany({
        where: {
          id_venta: idVenta,
          estado: { not: "pagada" },
        },
        data: {
          estado: "pagada",
          odoo_sync_error: null,
        },
      });
      if (claimed.count === 0) {
        covered = true;
        return;
      }

      const warehouseOdooId = venta.odoo_warehouse_id;
      if (!warehouseOdooId) {
        throw new Error(`Venta ${idVenta} sin almacén Odoo asignado`);
      }

      for (const item of venta.detalles) {
        const cantidad = money(item.cantidad);
        const stocks = await tx.stock.findMany({
          where: {
            id_producto: item.id_producto,
            almacen: { odoo_id: warehouseOdooId },
          },
        });
        if (stocks.length === 0) continue;
        const disponible = stocks.reduce(
          (sum, row) => sum + money(row.cantidad),
          0,
        );
        if (disponible < cantidad) {
          throw new Error(`Stock insuficiente: ${item.nombre_producto}`);
        }
        await deductStock(tx, item.id_producto, cantidad, warehouseOdooId);
      }

      if (venta.envios.length > 0) {
        await tx.envio.updateMany({
          where: { id_venta: idVenta },
          data: { estado: "confirmado" },
        });
      }

      // La fila shell (preference id, sin transaction_id) no se marca aprobada
      // para no inflar la suma si hay varios parciales (2 tarjetas).

      covered = true;
      shouldSyncOdoo = true;
    });

    if (shouldSyncOdoo) {
      sendOrderConfirmationEmail(idVenta).catch((err) => {
        console.error("[order-mail] failed", { idVenta, err });
      });
      if (options?.syncOdoo !== false) {
        syncVentaToOdoo(idVenta).catch((err) => {
          console.error(`Odoo sync failed for venta ${idVenta}:`, err);
        });
      }
    }

    return covered ? "approved" : "pending";
  }

  const rejected = status === "rejected" || status === "cancelled";
  const mpMotivo = statusDetail
    ? `MP ${status}: ${statusDetail}`
    : `MP ${status}`;

  const existing = await prisma.pago.findUnique({
    where: { transaction_id: transactionId },
  });

  if (!existing) {
    const fullAmount = almostEqual(amount, total);
    const shell = await prisma.pago.findFirst({
      where: {
        id_venta: idVenta,
        tipo_pago: { in: [...MP_TIPOS] },
        transaction_id: null,
        estado: { not: "aprobado" },
      },
      orderBy: { id_pago: "asc" },
    });

    if (shell && fullAmount) {
      await prisma.pago.update({
        where: { id_pago: shell.id_pago },
        data: {
          estado: rejected ? "rechazado" : "pendiente",
          transaction_id: transactionId,
          monto: amount,
        },
      });
    } else {
      await prisma.pago.create({
        data: {
          id_venta: idVenta,
          tipo_pago: tipoPago,
          estado: rejected ? "rechazado" : "pendiente",
          monto: amount,
          transaction_id: transactionId,
          referencia: null,
        },
      });
    }
  } else if (existing.estado !== "aprobado") {
    await prisma.pago.update({
      where: { id_pago: existing.id_pago },
      data: {
        estado: rejected ? "rechazado" : "pendiente",
        monto: amount,
      },
    });
  }

  if (rejected) {
    const aprobados = await prisma.pago.findMany({
      where: {
        id_venta: idVenta,
        tipo_pago: { in: [...MP_TIPOS] },
        estado: "aprobado",
      },
    });
    const sumApproved = aprobados.reduce((s, p) => s + money(p.monto), 0);

    // Con 2 tarjetas, el rechazo de un parcial no debe cancelar si ya hay
    // acreditaciones; solo cancelamos cuando el rechazo es del total (1 tarjeta)
    // o no hay ningún aprobado.
    const shouldCancel =
      sumApproved < 0.01 && almostEqual(amount, total);

    await prisma.venta.update({
      where: { id_venta: idVenta },
      data: {
        ...(shouldCancel && venta.estado !== "pagada"
          ? { estado: "cancelada" as const }
          : {}),
        odoo_sync_error: mpMotivo,
      },
    });

    if (shouldCancel && venta.estado !== "pagada") {
      await releaseCuponForVenta(idVenta);
    }

    return "rejected";
  }

  await prisma.venta.update({
    where: { id_venta: idVenta },
    data: { odoo_sync_error: mpMotivo },
  });

  return "pending";
}
