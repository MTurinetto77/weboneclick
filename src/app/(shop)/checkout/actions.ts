"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { clearCartCookie, deductStock, readCartLines, resolveCart } from "@/lib/cart";
import { prisma } from "@/lib/prisma";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) || "").trim();
}

export async function confirmarVenta(formData: FormData) {
  const cart = await resolveCart(await readCartLines());
  if (!cart.canCheckout || cart.items.length === 0) {
    throw new Error("El carrito no está listo para checkout");
  }

  const session = await auth();
  const checkoutMode = str(formData, "checkout_mode");
  const nombre = str(formData, "nombre");
  const apellido = str(formData, "apellido");
  let mail = str(formData, "mail").toLowerCase();
  const telefono = str(formData, "telefono") || null;
  const tipo_documento = str(formData, "tipo_documento") || null;
  const numero_documento = str(formData, "numero_documento") || null;
  const tipo_entrega = str(formData, "tipo_entrega");
  let tipo_pago = str(formData, "tipo_pago");

  if (checkoutMode !== "invitado" && session?.user?.email) {
    mail = session.user.email.toLowerCase();
  }

  if (!nombre || !apellido || !mail) {
    throw new Error("Completá nombre, apellido y mail");
  }
  if (tipo_entrega !== "envio" && tipo_entrega !== "retiro") {
    throw new Error("Tipo de entrega inválido");
  }
  if (tipo_entrega === "envio") {
    tipo_pago = "online";
  }
  if (tipo_pago !== "online" && tipo_pago !== "tienda") {
    throw new Error("Tipo de pago inválido");
  }
  if (tipo_entrega === "envio") {
    const calle = str(formData, "calle");
    const numero = str(formData, "numero");
    const localidad = str(formData, "localidad");
    const provincia = str(formData, "provincia");
    if (!calle || !numero || !localidad || !provincia) {
      throw new Error("Calle, número, localidad y provincia son obligatorios");
    }
  }

  const descuento = 0;
  const costo_envio = 0;
  const subtotal = cart.subtotal;
  const total = subtotal - descuento + costo_envio;
  const id_usuario =
    checkoutMode !== "invitado" &&
    session?.user?.email?.toLowerCase() === mail &&
    session.user.id
      ? session.user.id
      : null;

  const id_venta = await prisma.$transaction(async (tx) => {
    for (const item of cart.items) {
      const stocks = await tx.stock.findMany({ where: { id_producto: item.id_producto } });
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
          id_usuario,
        },
      });
    }

    let id_direccion: number | null = null;
    if (tipo_entrega === "envio") {
      const direccion = await tx.direccion.create({
        data: {
          id_cliente: cliente.id_cliente,
          calle: str(formData, "calle"),
          numero: str(formData, "numero"),
          piso: str(formData, "piso") || null,
          departamento: str(formData, "departamento") || null,
          barrio: str(formData, "barrio") || null,
          localidad: str(formData, "localidad"),
          provincia: str(formData, "provincia"),
          pais: str(formData, "pais") || "Argentina",
          codigo_postal: str(formData, "codigo_postal") || null,
          referencias: str(formData, "referencias") || null,
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

    for (const item of cart.items) {
      await deductStock(tx, item.id_producto, item.cantidad);
    }

    return venta.id_venta;
  });

  await clearCartCookie();
  revalidatePath("/carrito");
  revalidatePath("/catalogo");
  revalidatePath("/");
  redirect(`/checkout/confirmacion/${id_venta}`);
}
