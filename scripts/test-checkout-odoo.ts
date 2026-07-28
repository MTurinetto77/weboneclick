/**
 * Prueba E2E checkout → Odoo sin cobrar en Mercado Pago.
 * Uso:
 *   npm run test:checkout-odoo
 *   npm run test:checkout-odoo -- --envio
 *   npm run test:checkout-odoo -- --envio --cupon
 *   npm run test:checkout-odoo -- --cupon 5000
 *   npm run test:checkout-odoo -- --venta-id 123
 */
import "dotenv/config";
import type { PaymentResponse } from "mercadopago/dist/clients/payment/commonTypes";
import { applyMercadoPagoPayment } from "../src/lib/mp-payment-sync";
import { getShippingWarehouseOdooId } from "../src/lib/almacenes";
import { CONTADO_DISCOUNT } from "../src/lib/pricing";
import { syncVentaToOdoo } from "../src/lib/odoo-venta";
import { odooRead } from "../src/lib/odoo-write";
import { prisma } from "../src/lib/prisma";

const round2 = (n: number) => Math.round(n * 100) / 100;

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function findProductForWarehouse(warehouseOdooId: number) {
  const rows = await prisma.stock.findMany({
    where: {
      cantidad: { gt: 0 },
      producto: { activo: true, odoo_id: { not: null } },
      almacen: { odoo_id: warehouseOdooId },
    },
    include: {
      producto: {
        include: {
          precios: { orderBy: { fecha_desde: "desc" }, take: 1 },
        },
      },
      almacen: { include: { tienda: true } },
    },
    orderBy: { cantidad: "desc" },
    take: 30,
  });

  const row = rows.find(
    (r) => r.producto.precios[0] && Number(r.producto.precios[0].precio) > 1000
  );
  if (!row?.producto.odoo_id) {
    throw new Error(
      `No hay producto con stock/precio/odoo_id en almacén Odoo ${warehouseOdooId}`
    );
  }

  return {
    id_producto: row.id_producto,
    odoo_id: row.producto.odoo_id,
    titulo: row.producto.titulo,
    precio: Number(row.producto.precios[0]!.precio),
    id_tienda: row.almacen?.tienda?.id_tienda ?? null,
    tiendaNombre: row.almacen?.tienda?.nombre ?? null,
    warehouseOdooId,
  };
}

async function findProductForRetiro() {
  const rows = await prisma.stock.findMany({
    where: {
      cantidad: { gt: 0 },
      producto: { activo: true, odoo_id: { not: null } },
      almacen: { id_tienda: { not: null }, odoo_id: { not: null } },
    },
    include: {
      producto: {
        include: {
          precios: { orderBy: { fecha_desde: "desc" }, take: 1 },
        },
      },
      almacen: { include: { tienda: true } },
    },
    orderBy: { cantidad: "desc" },
    take: 20,
  });

  const row = rows.find(
    (r) => r.producto.precios[0] && Number(r.producto.precios[0].precio) > 1000
  );
  if (!row?.almacen?.tienda || !row.producto.odoo_id) {
    throw new Error(
      "No hay producto con stock, precio y odoo_id en una tienda de retiro"
    );
  }

  return {
    id_producto: row.id_producto,
    odoo_id: row.producto.odoo_id,
    titulo: row.producto.titulo,
    precio: Number(row.producto.precios[0]!.precio),
    id_tienda: row.almacen.tienda.id_tienda,
    tiendaNombre: row.almacen.tienda.nombre,
    warehouseOdooId: row.almacen.odoo_id!,
  };
}

async function createTestVenta(options: {
  tipo: "retiro" | "envio";
  cuponMonto: number;
}) {
  const { tipo, cuponMonto } = options;
  const stamp = Date.now();
  const pick =
    tipo === "envio"
      ? await findProductForWarehouse(await getShippingWarehouseOdooId())
      : await findProductForRetiro();

  // Simula pago "mercado_pago" (contado −10%) + cupón de monto fijo sobre productos
  const subtotal = pick.precio;
  const precioContado = round2(pick.precio * (1 - CONTADO_DISCOUNT));
  const descuentoContado = round2(subtotal - precioContado);
  const descuentoCupon = round2(
    Math.min(Math.max(0, cuponMonto), precioContado)
  );
  const precioCobrado = round2(precioContado - descuentoCupon);
  const descuento = round2(descuentoContado + descuentoCupon);
  const costo_envio = tipo === "envio" ? 4380.44 : 0;
  const total = round2(precioCobrado + costo_envio);

  const mail = `test.cupon.${stamp}@oneclick.local`;
  const dni = String(20_000_000 + (stamp % 10_000_000));
  const codigoCupon = `TESTCUP${stamp.toString().slice(-8)}`;

  const venta = await prisma.$transaction(async (tx) => {
    const admin = await tx.usuario.findFirst({
      where: { tipo_usuario: "admin" },
      select: { id_usuario: true },
    });
    if (!admin) throw new Error("No hay usuario admin para emitir el cupón");

    let id_cupon: number | null = null;
    if (descuentoCupon > 0) {
      const cupon = await tx.cupones_descuento.create({
        data: {
          codigo: codigoCupon,
          monto: descuentoCupon,
          fecha_vigencia: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          estado: "consumido",
          grupo: "test-odoo",
          id_usuario_creacion: admin.id_usuario,
          fecha_consumido: new Date(),
        },
      });
      id_cupon = cupon.id_cupon;
    }

    const cliente = await tx.cliente.create({
      data: {
        nombre: "Marina",
        apellido: "Cupon",
        mail,
        tipo_documento: "DNI",
        numero_documento: dni,
        responsabilidad_impositiva: "CF",
        telefono: "3415222333",
      },
    });

    const direccionEntrega = await tx.direccion.create({
      data: {
        id_cliente: cliente.id_cliente,
        calle: tipo === "envio" ? "Córdoba" : "San Martín",
        numero: tipo === "envio" ? "2450" : "1234",
        piso: tipo === "envio" ? "3" : null,
        departamento: tipo === "envio" ? "B" : null,
        barrio: tipo === "envio" ? "Centro" : null,
        localidad: "Rosario",
        provincia: "Santa Fe",
        pais: "Argentina",
        codigo_postal: "2000",
        referencias: tipo === "envio" ? "Timbre Cupon Test" : null,
      },
    });

    const direccionFact =
      tipo === "envio"
        ? await tx.direccion.create({
            data: {
              id_cliente: cliente.id_cliente,
              calle: "Pellegrini",
              numero: "1500",
              localidad: "Rosario",
              provincia: "Santa Fe",
              pais: "Argentina",
              codigo_postal: "2000",
            },
          })
        : direccionEntrega;

    const v = await tx.venta.create({
      data: {
        id_cliente: cliente.id_cliente,
        estado: "pendiente",
        tipo_entrega: tipo,
        id_tienda_retiro: tipo === "retiro" ? pick.id_tienda : null,
        odoo_warehouse_id: pick.warehouseOdooId,
        subtotal,
        descuento,
        costo_envio,
        total,
        id_direccion_facturacion: direccionFact.id_direccion,
        id_cupon,
        receptor_nombre: tipo === "envio" ? "Pedro Receptor" : null,
        receptor_dni: tipo === "envio" ? "27888999" : null,
        idempotency_key: `test-odoo-${tipo}-cupon-${stamp}`,
        odoo_sync_estado: "pendiente",
      },
    });

    if (id_cupon != null) {
      await tx.cupones_descuento.update({
        where: { id_cupon },
        data: { id_venta: v.id_venta },
      });
    }

    if (tipo === "envio") {
      await tx.envio.create({
        data: {
          id_venta: v.id_venta,
          id_direccion: direccionEntrega.id_direccion,
          tipo: "smartpost",
          estado: "pendiente",
        },
      });
    }

    await tx.venta_detalle.create({
      data: {
        id_venta: v.id_venta,
        item: 1,
        id_producto: pick.id_producto,
        nombre_producto: pick.titulo,
        cantidad: 1,
        precio_unitario: pick.precio,
        precio_cobrado: precioCobrado,
        subtotal: pick.precio,
      },
    });

    await tx.pago.create({
      data: {
        id_venta: v.id_venta,
        tipo_pago: "mercado_pago",
        estado: "pendiente",
        monto: total,
      },
    });

    return v;
  });

  console.log("Venta de prueba creada:", {
    id_venta: venta.id_venta,
    tipo_entrega: tipo,
    cliente: mail,
    producto: pick.titulo,
    odoo_product_id: pick.odoo_id,
    warehouse_odoo_id: pick.warehouseOdooId,
    precio_lista: pick.precio,
    precio_contado: precioContado,
    cupon: descuentoCupon > 0 ? { codigo: codigoCupon, monto: descuentoCupon } : null,
    precio_cobrado: precioCobrado,
    costo_envio,
    total_mp: total,
  });

  return venta.id_venta;
}

async function main() {
  const ventaArg = argValue("--venta-id");
  const tipo: "retiro" | "envio" = hasFlag("--envio") ? "envio" : "retiro";
  const cuponRaw = argValue("--cupon");
  const withCupon = hasFlag("--cupon");
  const cuponMonto = withCupon
    ? Number(cuponRaw && !cuponRaw.startsWith("--") ? cuponRaw : 5000)
    : 0;

  const idVenta = ventaArg
    ? Number(ventaArg)
    : await createTestVenta({ tipo, cuponMonto });

  const venta = await prisma.venta.findUnique({
    where: { id_venta: idVenta },
    include: { pagos: true, envios: true, cliente: true, cupon: true },
  });
  if (!venta) throw new Error(`Venta ${idVenta} no encontrada`);
  if (venta.estado === "pagada") {
    console.log(`Venta ${idVenta} ya está pagada; solo reintento sync Odoo.`);
  } else {
    const txId = `TEST-MP-${Date.now()}`;
    const mockPayment = {
      id: txId,
      external_reference: String(idVenta),
      transaction_amount: Number(venta.total),
      status: "approved",
    } as unknown as PaymentResponse;

    console.log(
      `Simulando pago MP aprobado (${txId}) por $${Number(venta.total)}…`
    );
    const mpResult = await applyMercadoPagoPayment(mockPayment, {
      syncOdoo: false,
    });
    console.log("Resultado MP local:", mpResult);
  }

  console.log("Sincronizando con Odoo test…");
  const odooResult = await syncVentaToOdoo(idVenta);
  console.log("Resultado sync Odoo:", odooResult);

  const updated = await prisma.venta.findUnique({
    where: { id_venta: idVenta },
    select: {
      id_venta: true,
      estado: true,
      tipo_entrega: true,
      subtotal: true,
      descuento: true,
      costo_envio: true,
      total: true,
      odoo_sync_estado: true,
      odoo_sync_error: true,
      odoo_order_id: true,
      odoo_order_name: true,
      odoo_payment_id: true,
      odoo_payment_name: true,
      odoo_partner_id: true,
      odoo_warehouse_id: true,
      cupon: { select: { codigo: true, monto: true } },
      cliente: { select: { nombre: true, apellido: true, mail: true } },
      envios: { select: { estado: true, tipo: true } },
    },
  });
  console.log("\nVenta final:");
  console.log(JSON.stringify(updated, null, 2));

  if (updated?.odoo_order_id) {
    const [order] = await odooRead<{
      amount_total: number;
      order_line: number[];
    }>("sale.order", [updated.odoo_order_id], ["amount_total", "order_line"]);
    const lines = order?.order_line?.length
      ? await odooRead<{
          name: string;
          price_unit: number;
          price_total: number;
          product_id: [number, string] | false;
        }>("sale.order.line", order.order_line, [
          "name",
          "price_unit",
          "price_total",
          "product_id",
        ])
      : [];
    console.log("\nOrden Odoo:");
    console.log(
      JSON.stringify(
        {
          amount_total: order?.amount_total,
          total_venta_mp: Number(updated.total),
          match: Math.abs(Number(order?.amount_total ?? 0) - Number(updated.total)) <= 1,
          lines: lines.map((l) => ({
            name: l.name,
            product: Array.isArray(l.product_id) ? l.product_id[1] : null,
            price_unit: l.price_unit,
            price_total: l.price_total,
          })),
        },
        null,
        2
      )
    );
  }

  if (odooResult !== "ok") process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
