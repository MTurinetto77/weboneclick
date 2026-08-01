import { randomUUID } from "crypto";
import { cartHasStockInWarehouse, deductStock, resolveCart, type ResolvedCart } from "@/lib/cart";
import {
  ensureCheckoutIdempotencyKey,
  readCheckoutIdempotencyKey,
  rotateCheckoutIdempotencyKey,
} from "@/lib/checkout-idempotency";
import {
  CUPON_ESTADO_CONSUMIDO,
  CUPON_ESTADO_EMITIDO,
  clearCuponCookie,
  resolveAppliedCupon,
  type ValidCupon,
} from "@/lib/cupones";
import { resolveCostoEnvio } from "@/lib/envio-costo";
import {
  checkStockOdooWarehouse,
  formatStockShortageMessage,
} from "@/lib/odoo-stock";
import { resolveWarehouseOdooId } from "@/lib/odoo-venta";
import { isOdooSyncEnabled } from "@/lib/odoo-config";
import { CONTADO_DISCOUNT } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { ALMACEN_WEB_SELECT, sumSellableStock, type StockRow } from "@/lib/almacenes";
import { resolveSelectedRegaloProducto } from "@/lib/regalos";

export type TipoPagoCheckout = "tarjeta" | "mercado_pago";

const round2 = (n: number) => Math.round(n * 100) / 100;

function field(fields: Record<string, string>, key: string): string {
  return String(fields[key] ?? "").trim();
}

export type VentaPendiente = {
  id_venta: number;
  access_token: string;
  subtotal: number;
  descuento: number;
  costo_envio: number;
  total: number;
  nombre: string;
  apellido: string;
  mail: string;
  /** Items con el precio unitario efectivamente cobrado (con descuento contado si aplica) */
  itemsCobro: {
    id_producto: number;
    titulo: string;
    cantidad: number;
    unit_price: number;
  }[];
};

/**
 * Valida los datos del checkout y registra la venta como pendiente de pago.
 * No descuenta stock: eso ocurre recién cuando Mercado Pago aprueba el pago.
 */
export async function createPendingVenta(
  fields: Record<string, string>,
  tipo_pago: TipoPagoCheckout,
  sessionEmail: string | null,
  sessionUserId: number | null = null,
  /** @deprecated La clave viene de cookie httpOnly; este arg se ignora. */
  _idempotencyKey: string | null = null,
): Promise<VentaPendiente> {
  let idemKey = await readCheckoutIdempotencyKey();
  if (idemKey) {
    const existing = await prisma.venta.findUnique({
      where: { idempotency_key: idemKey },
      include: { cliente: true, detalles: true },
    });
    if (existing && existing.estado === "pendiente") {
      const itemsCobro = existing.detalles
        .filter((d) => Number(d.precio_cobrado ?? d.precio_unitario) > 0)
        .map((d) => ({
          id_producto: d.id_producto,
          titulo: d.nombre_producto,
          cantidad: Number(d.cantidad),
          unit_price: Number(d.precio_cobrado ?? d.precio_unitario),
        }));
      return {
        id_venta: existing.id_venta,
        access_token: existing.access_token,
        subtotal: Number(existing.subtotal),
        descuento: Number(existing.descuento),
        costo_envio: Number(existing.costo_envio),
        total: Number(existing.total),
        nombre: existing.cliente.nombre,
        apellido: existing.cliente.apellido,
        mail: existing.cliente.mail,
        itemsCobro,
      };
    }
    // Clave ya asociada a una venta cerrada: emitir una nueva.
    if (existing) {
      await rotateCheckoutIdempotencyKey();
      idemKey = await ensureCheckoutIdempotencyKey();
    }
  } else {
    idemKey = await ensureCheckoutIdempotencyKey();
  }

  const cart = await resolveCart();
  if (!cart.canCheckout || cart.items.length === 0) {
    throw new Error("El carrito no está listo para checkout");
  }

  const checkoutMode = field(fields, "checkout_mode");
  const nombre = field(fields, "nombre");
  const apellido = field(fields, "apellido");
  let mail = field(fields, "mail").toLowerCase();
  const telefono = field(fields, "telefono") || null;
  const tipo_documento = field(fields, "tipo_documento") || null;
  const numero_documento = field(fields, "numero_documento") || null;
  const responsabilidadRaw = field(fields, "responsabilidad_impositiva").toUpperCase();
  const responsabilidad_impositiva =
    responsabilidadRaw === "RI" ? "RI" : "CF";
  const tipo_entrega = field(fields, "tipo_entrega");
  const otraPersona = field(fields, "receptor_otra_persona") === "1";
  const receptor_nombre = otraPersona ? field(fields, "receptor_nombre") || null : null;
  const receptor_dni = otraPersona ? field(fields, "receptor_dni") || null : null;

  if (checkoutMode !== "invitado" && sessionEmail) {
    mail = sessionEmail.toLowerCase();
  }

  if (!nombre || !apellido || !mail) {
    throw new Error("Completá nombre, apellido y mail");
  }
  if (tipo_entrega !== "envio" && tipo_entrega !== "retiro") {
    throw new Error("Tipo de entrega inválido");
  }
  if (otraPersona && (!receptor_nombre || !receptor_dni)) {
    throw new Error("Completá nombre y DNI de quien retira/recibe");
  }

  let id_tienda_retiro: number | null = null;
  if (tipo_entrega === "retiro") {
    const tiendaRaw = field(fields, "tienda_retiro");
    const tiendaId = Number(tiendaRaw);
    if (!Number.isInteger(tiendaId) || tiendaId <= 0) {
      throw new Error("Seleccioná la tienda de retiro");
    }
    const tienda = await prisma.tienda.findFirst({
      where: { id_tienda: tiendaId, activo: true },
    });
    if (!tienda) {
      throw new Error("Tienda de retiro inválida");
    }
    id_tienda_retiro = tiendaId;
  }

  const mismaFacturacion =
    tipo_entrega === "envio" && field(fields, "misma_direccion_facturacion") === "1";

  if (tipo_entrega === "envio") {
    const calle = field(fields, "calle");
    const numero = field(fields, "numero");
    const localidad = field(fields, "localidad");
    const provincia = field(fields, "provincia");
    const codigo_postal = field(fields, "codigo_postal");
    if (!calle || !numero || !localidad || !provincia) {
      throw new Error("Calle, número, localidad y provincia de entrega son obligatorios");
    }
    if (!codigo_postal) {
      throw new Error("Ingresá el código postal de entrega");
    }
  }

  if (!mismaFacturacion) {
    const calle = field(fields, "fact_calle");
    const numero = field(fields, "fact_numero");
    const localidad = field(fields, "fact_localidad");
    const provincia = field(fields, "fact_provincia");
    if (!calle || !numero || !localidad || !provincia) {
      throw new Error(
        "Calle, número, localidad y provincia de facturación son obligatorios",
      );
    }
  }

  const cupon = await resolveAppliedCupon();
  const {
    subtotal,
    descuento,
    total: totalProductos,
    itemsCobro,
    descuentoCupon,
  } = computeTotals(cart, tipo_pago, cupon?.monto ?? 0);

  const idProductoRegaloRaw = Number(field(fields, "id_producto_regalo"));
  const idProductoRegalo =
    Number.isFinite(idProductoRegaloRaw) && idProductoRegaloRaw > 0
      ? idProductoRegaloRaw
      : null;
  const giftProducto = await resolveSelectedRegaloProducto(subtotal, idProductoRegalo);

  let costo_envio = 0;
  if (tipo_entrega === "envio") {
    const quote = await resolveCostoEnvio({
      codigo_postal: field(fields, "codigo_postal"),
      subtotal,
    });
    if (!quote.ok) {
      throw new Error(quote.message || "Código postal sin cobertura de envío");
    }
    costo_envio = quote.costo;
  }

  const total = round2(totalProductos + costo_envio);

  const warehouseOdooId = await resolveWarehouseOdooId(
    tipo_entrega,
    id_tienda_retiro
  );

  if (!cartHasStockInWarehouse(cart.items, warehouseOdooId)) {
    const missing = cart.items.find((item) => {
      const qty = item.stockPorAlmacen.get(warehouseOdooId) ?? 0;
      return qty < item.cantidad;
    });
    throw new Error(
      missing
        ? `Stock insuficiente en el almacén seleccionado: ${missing.titulo}`
        : "Stock insuficiente en el almacén seleccionado"
    );
  }

  if (giftProducto) {
    const giftStocks = await prisma.stock.findMany({
      where: { id_producto: giftProducto.id_producto },
      include: { almacen: { select: ALMACEN_WEB_SELECT } },
    });
    const tracked = giftStocks.some((s) => s.almacen?.odoo_id != null);
    if (tracked) {
      const whStock =
        giftStocks.find((s) => s.almacen?.odoo_id === warehouseOdooId)?.cantidad ??
        0;
      if (Number(whStock) < 1) {
        throw new Error(`Sin stock del regalo: ${giftProducto.titulo}`);
      }
    }
  }

  if (await isOdooSyncEnabled()) {
    const productIds = [
      ...cart.items.map((i) => i.id_producto),
      ...(giftProducto ? [giftProducto.id_producto] : []),
    ];
    const products = await prisma.producto.findMany({
      where: { id_producto: { in: productIds } },
      select: { id_producto: true, odoo_id: true, titulo: true },
    });
    const byId = new Map(products.map((p) => [p.id_producto, p]));

    if (giftProducto) {
      const gp = byId.get(giftProducto.id_producto);
      if (!gp?.odoo_id) {
        throw new Error(
          `El producto de regalo "${giftProducto.titulo}" no está sincronizado con Odoo (falta odoo_id)`,
        );
      }
    }

    const stockItems = [
      ...cart.items.map((item) => {
        const p = byId.get(item.id_producto);
        if (!p?.odoo_id) return null;
        return {
          odooProductId: p.odoo_id,
          cantidad: item.cantidad,
          titulo: item.titulo,
        };
      }),
      ...(giftProducto
        ? [
            (() => {
              const p = byId.get(giftProducto.id_producto);
              if (!p?.odoo_id) return null;
              return {
                odooProductId: p.odoo_id,
                cantidad: 1,
                titulo: giftProducto.titulo,
              };
            })(),
          ]
        : []),
    ].filter(Boolean) as {
      odooProductId: number;
      cantidad: number;
      titulo: string;
    }[];

    const shortages = await checkStockOdooWarehouse(stockItems, warehouseOdooId);
    if (shortages.length) {
      throw new Error(formatStockShortageMessage(shortages));
    }
  }

  const cobroByProduct = new Map(
    itemsCobro.map((i) => [i.id_producto, i.unit_price])
  );

  const isGuestCheckout = checkoutMode === "invitado";
  const id_usuario =
    !isGuestCheckout &&
    sessionEmail?.toLowerCase() === mail &&
    sessionUserId
      ? sessionUserId
      : null;

  const access_token = randomUUID().replace(/-/g, "");

  const id_venta = await prisma.$transaction(async (tx) => {
    for (const item of cart.items) {
      const stocks = await tx.stock.findMany({
        where: { id_producto: item.id_producto },
        include: { almacen: { select: ALMACEN_WEB_SELECT } },
      });
      const stockTotal = sumSellableStock(stocks as StockRow[]);
      const whStock =
        stocks.find((s) => s.almacen?.odoo_id === warehouseOdooId)?.cantidad ??
        0;
      const tracked = stocks.some((s) => s.almacen?.odoo_id != null);
      if (item.precio == null) {
        throw new Error(`Sin precio: ${item.titulo}`);
      }
      if (tracked && Number(whStock) < item.cantidad) {
        throw new Error(`Stock insuficiente: ${item.titulo}`);
      }
      if (tracked && stockTotal < item.cantidad) {
        throw new Error(`Stock insuficiente: ${item.titulo}`);
      }
    }

    let cliente = await tx.cliente.findUnique({ where: { mail } });
    if (cliente) {
      // Invitado no puede sobrescribir PII de un cliente existente (solo enlaza).
      if (!isGuestCheckout) {
        cliente = await tx.cliente.update({
          where: { id_cliente: cliente.id_cliente },
          data: {
            nombre,
            apellido,
            telefono,
            tipo_documento,
            numero_documento,
            responsabilidad_impositiva,
            id_usuario: cliente.id_usuario ?? id_usuario,
          },
        });
      }
    } else {
      cliente = await tx.cliente.create({
        data: {
          nombre,
          apellido,
          mail,
          telefono,
          tipo_documento,
          numero_documento,
          responsabilidad_impositiva,
          id_usuario,
        },
      });
    }

    let id_direccion: number | null = null;
    let id_direccion_facturacion: number | null = null;

    if (tipo_entrega === "envio") {
      const direccion = await tx.direccion.create({
        data: {
          id_cliente: cliente.id_cliente,
          calle: field(fields, "calle"),
          numero: field(fields, "numero"),
          piso: field(fields, "piso") || null,
          departamento: field(fields, "departamento") || null,
          barrio: field(fields, "barrio") || null,
          localidad: field(fields, "localidad"),
          provincia: field(fields, "provincia"),
          pais: field(fields, "pais") || "Argentina",
          codigo_postal: field(fields, "codigo_postal") || null,
          referencias: field(fields, "referencias") || null,
        },
      });
      id_direccion = direccion.id_direccion;
      if (!cliente.id_direccion_principal) {
        await tx.cliente.update({
          where: { id_cliente: cliente.id_cliente },
          data: { id_direccion_principal: id_direccion },
        });
      }
    }

    if (mismaFacturacion && id_direccion != null) {
      id_direccion_facturacion = id_direccion;
    } else {
      const fact = await tx.direccion.create({
        data: {
          id_cliente: cliente.id_cliente,
          calle: field(fields, "fact_calle"),
          numero: field(fields, "fact_numero"),
          piso: field(fields, "fact_piso") || null,
          departamento: field(fields, "fact_departamento") || null,
          barrio: field(fields, "fact_barrio") || null,
          localidad: field(fields, "fact_localidad"),
          provincia: field(fields, "fact_provincia"),
          pais: field(fields, "fact_pais") || "Argentina",
          codigo_postal: field(fields, "fact_codigo_postal") || null,
          referencias: field(fields, "fact_referencias") || null,
        },
      });
      id_direccion_facturacion = fact.id_direccion;
      if (!cliente.id_direccion_principal && tipo_entrega === "retiro") {
        await tx.cliente.update({
          where: { id_cliente: cliente.id_cliente },
          data: { id_direccion_principal: id_direccion_facturacion },
        });
      }
    }

    let id_cupon: number | null = null;
    if (cupon && descuentoCupon > 0) {
      const consumed = await tx.cupones_descuento.updateMany({
        where: {
          id_cupon: cupon.id_cupon,
          estado: CUPON_ESTADO_EMITIDO,
        },
        data: {
          estado: CUPON_ESTADO_CONSUMIDO,
          fecha_consumido: new Date(),
        },
      });
      if (consumed.count === 0) {
        throw new Error("El cupón ya fue utilizado");
      }
      id_cupon = cupon.id_cupon;
    }

    const venta = await tx.venta.create({
      data: {
        id_cliente: cliente.id_cliente,
        estado: "pendiente",
        tipo_entrega,
        subtotal,
        descuento,
        costo_envio,
        total,
        receptor_nombre,
        receptor_dni,
        id_direccion_facturacion,
        id_cupon,
        idempotency_key: idemKey,
        access_token,
        id_tienda_retiro,
        odoo_warehouse_id: warehouseOdooId,
        detalles: {
          create: [
            ...cart.items.map((item, index) => ({
              item: index + 1,
              id_producto: item.id_producto,
              nombre_producto: item.titulo,
              cantidad: item.cantidad,
              precio_unitario: item.precio!,
              precio_cobrado: cobroByProduct.get(item.id_producto) ?? item.precio!,
              subtotal: item.subtotal!,
            })),
            ...(giftProducto
              ? [
                  {
                    item: cart.items.length + 1,
                    id_producto: giftProducto.id_producto,
                    nombre_producto: `${giftProducto.titulo} (Regalo)`,
                    cantidad: 1,
                    precio_unitario: 0,
                    precio_cobrado: 0,
                    subtotal: 0,
                  },
                ]
              : []),
          ],
        },
        pagos: {
          create: {
            tipo_pago,
            estado: "pendiente",
            monto: total,
            referencia: null,
            transaction_id: null,
          },
        },
      },
    });

    if (id_cupon != null) {
      await tx.cupones_descuento.update({
        where: { id_cupon },
        data: { id_venta: venta.id_venta },
      });
    }

    if (tipo_entrega === "envio" && id_direccion != null) {
      await tx.envio.create({
        data: {
          id_venta: venta.id_venta,
          tipo: "domicilio",
          estado: "pendiente",
          id_direccion,
          tracking: null,
        },
      });
    }

    return venta.id_venta;
  });

  await clearCuponCookie();
  // No rotar la clave aquí: permite reintentar el pago sobre la misma venta pendiente.

  return {
    id_venta,
    access_token,
    subtotal,
    descuento,
    costo_envio,
    total,
    // Mostrar los datos del formulario (en invitado el cliente existente no se actualiza).
    nombre,
    apellido,
    mail,
    itemsCobro,
  };
}

/** URL de confirmación con token opaco (anti-IDOR). */
export function confirmationPath(id_venta: number, access_token: string, mp?: string) {
  const q = new URLSearchParams({ t: access_token });
  if (mp) q.set("mp", mp);
  return `/checkout/confirmacion/${id_venta}?${q.toString()}`;
}

/**
 * Totales según medio de pago: la opción "mercado_pago" (contado) aplica 10% de
 * descuento por ítem; luego un cupón de monto fijo se descuenta del subtotal de
 * productos (no del envío) y se redistribuye en unit_price para MP.
 */
export function computeTotals(
  cart: ResolvedCart,
  tipo_pago: TipoPagoCheckout,
  cuponMonto = 0,
) {
  const subtotal = cart.subtotal;
  const itemsBase = cart.items.map((item) => ({
    id_producto: item.id_producto,
    titulo: item.titulo,
    cantidad: item.cantidad,
    unit_price:
      tipo_pago === "mercado_pago"
        ? round2(item.precio! * (1 - CONTADO_DISCOUNT))
        : item.precio!,
  }));

  const totalAntesCupon = round2(
    itemsBase.reduce((acc, i) => acc + i.unit_price * i.cantidad, 0),
  );
  const descuentoContado = round2(subtotal - totalAntesCupon);
  const descuentoCupon = round2(
    Math.min(Math.max(0, cuponMonto), totalAntesCupon),
  );

  const itemsCobro = applyFixedDiscountToItems(itemsBase, descuentoCupon);
  const total = round2(
    itemsCobro.reduce((acc, i) => acc + i.unit_price * i.cantidad, 0),
  );
  const descuento = round2(descuentoContado + descuentoCupon);

  return {
    subtotal,
    descuento,
    descuentoContado,
    descuentoCupon,
    total,
    itemsCobro,
  };
}

/** Redistribuye un descuento fijo en unit_price para que la suma cuadre al centavo. */
function applyFixedDiscountToItems(
  items: {
    id_producto: number;
    titulo: string;
    cantidad: number;
    unit_price: number;
  }[],
  discount: number,
) {
  if (discount <= 0 || items.length === 0) return items;

  const subtotal = items.reduce((acc, i) => acc + i.unit_price * i.cantidad, 0);
  if (subtotal <= 0) return items;

  const result = items.map((item) => {
    const line = item.unit_price * item.cantidad;
    const share = (line / subtotal) * discount;
    const newLine = Math.max(0, line - share);
    const unit_price =
      item.cantidad > 0 ? round2(newLine / item.cantidad) : 0;
    return { ...item, unit_price };
  });

  const sum = round2(
    result.reduce((acc, i) => acc + i.unit_price * i.cantidad, 0),
  );
  const target = round2(subtotal - discount);
  const diff = round2(target - sum);
  if (Math.abs(diff) >= 0.01) {
    let idx = 0;
    let maxLine = -1;
    for (let i = 0; i < result.length; i++) {
      const line = result[i]!.unit_price * result[i]!.cantidad;
      if (line > maxLine) {
        maxLine = line;
        idx = i;
      }
    }
    const item = result[idx]!;
    if (item.cantidad > 0) {
      const newLine = Math.max(0, item.unit_price * item.cantidad + diff);
      item.unit_price = round2(newLine / item.cantidad);
    }
  }

  return result;
}

export type { ValidCupon };
export { deductStock };
