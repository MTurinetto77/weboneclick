import { deductStock, resolveCart, type ResolvedCart } from "@/lib/cart";
import { resolveCostoEnvio } from "@/lib/envio-costo";
import { CONTADO_DISCOUNT } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";

export type TipoPagoCheckout = "tarjeta" | "mercado_pago";

const round2 = (n: number) => Math.round(n * 100) / 100;

function field(fields: Record<string, string>, key: string): string {
  return String(fields[key] ?? "").trim();
}

export type VentaPendiente = {
  id_venta: number;
  subtotal: number;
  descuento: number;
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
  sessionUserId: number | null = null
): Promise<VentaPendiente> {
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

  if (checkoutMode !== "invitado" && sessionEmail) {
    mail = sessionEmail.toLowerCase();
  }

  if (!nombre || !apellido || !mail) {
    throw new Error("Completá nombre, apellido y mail");
  }
  if (tipo_entrega !== "envio" && tipo_entrega !== "retiro") {
    throw new Error("Tipo de entrega inválido");
  }
  if (tipo_entrega === "envio") {
    const calle = field(fields, "calle");
    const numero = field(fields, "numero");
    const localidad = field(fields, "localidad");
    const provincia = field(fields, "provincia");
    const codigo_postal = field(fields, "codigo_postal");
    if (!calle || !numero || !localidad || !provincia) {
      throw new Error("Calle, número, localidad y provincia son obligatorios");
    }
    if (!codigo_postal) {
      throw new Error("Ingresá el código postal de entrega");
    }
  }

  const { subtotal, descuento, total: totalProductos, itemsCobro } = computeTotals(
    cart,
    tipo_pago,
  );

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
  const id_usuario =
    checkoutMode !== "invitado" &&
    sessionEmail?.toLowerCase() === mail &&
    sessionUserId
      ? sessionUserId
      : null;

  const id_venta = await prisma.$transaction(async (tx) => {
    for (const item of cart.items) {
      const stocks = await tx.stock.findMany({
        where: { id_producto: item.id_producto },
      });
      const stockTotal = stocks.reduce((acc, s) => acc + Number(s.cantidad), 0);
      const tracked = stocks.length > 0;
      if (item.precio == null) {
        throw new Error(`Sin precio: ${item.titulo}`);
      }
      // Solo bloquear si el stock ya está sincronizado y no alcanza
      if (tracked && stockTotal < item.cantidad) {
        throw new Error(`Stock insuficiente: ${item.titulo}`);
      }
    }

    let cliente = await tx.cliente.findUnique({ where: { mail } });
    if (cliente) {
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

    const venta = await tx.venta.create({
      data: {
        id_cliente: cliente.id_cliente,
        estado: "pendiente",
        tipo_entrega,
        subtotal,
        descuento,
        costo_envio,
        total,
        detalles: {
          create: cart.items.map((item, index) => ({
            item: index + 1,
            id_producto: item.id_producto,
            nombre_producto: item.titulo,
            cantidad: item.cantidad,
            precio_unitario: item.precio!,
            subtotal: item.subtotal!,
          })),
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

  return { id_venta, subtotal, descuento, total, nombre, apellido, mail, itemsCobro };
}

/**
 * Totales según medio de pago: la opción "mercado_pago" (contado) aplica 10% de
 * descuento por ítem para que la preferencia de MP sume exactamente el total.
 */
export function computeTotals(cart: ResolvedCart, tipo_pago: TipoPagoCheckout) {
  const subtotal = cart.subtotal;
  const itemsCobro = cart.items.map((item) => ({
    id_producto: item.id_producto,
    titulo: item.titulo,
    cantidad: item.cantidad,
    unit_price:
      tipo_pago === "mercado_pago"
        ? round2(item.precio! * (1 - CONTADO_DISCOUNT))
        : item.precio!,
  }));
  const total = round2(
    itemsCobro.reduce((acc, i) => acc + i.unit_price * i.cantidad, 0)
  );
  return { subtotal, descuento: round2(subtotal - total), total, itemsCobro };
}

export { deductStock };
