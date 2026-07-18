import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { pickCurrentPrice } from "@/lib/products";

export const CART_COOKIE = "cart";
export const CART_MAX_AGE = 60 * 60 * 24 * 14; // 14 días

export type CartLine = {
  id_producto: number;
  cantidad: number;
};

export type ResolvedCartItem = {
  id_producto: number;
  titulo: string;
  cantidad: number;
  precio: number | null;
  stockTotal: number;
  imagen: string | null;
  subtotal: number | null;
  disponible: boolean;
};

export type ResolvedCart = {
  lines: CartLine[];
  items: ResolvedCartItem[];
  itemCount: number;
  subtotal: number;
  canCheckout: boolean;
};

function parseCart(raw: string | undefined): CartLine[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    const map = new Map<number, number>();
    for (const row of data) {
      if (!row || typeof row !== "object") continue;
      const id = Number((row as CartLine).id_producto);
      const qty = Number((row as CartLine).cantidad);
      if (!Number.isInteger(id) || id <= 0) continue;
      if (!Number.isFinite(qty) || qty <= 0) continue;
      map.set(id, Math.min(999, Math.floor(qty)));
    }
    return [...map.entries()].map(([id_producto, cantidad]) => ({ id_producto, cantidad }));
  } catch {
    return [];
  }
}

export async function readCartLines(): Promise<CartLine[]> {
  const jar = await cookies();
  return parseCart(jar.get(CART_COOKIE)?.value);
}

export async function writeCartLines(lines: CartLine[]): Promise<void> {
  const jar = await cookies();
  const cleaned = lines.filter((l) => l.cantidad > 0);
  if (cleaned.length === 0) {
    jar.delete(CART_COOKIE);
    return;
  }
  jar.set(CART_COOKIE, JSON.stringify(cleaned), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: CART_MAX_AGE,
  });
}

export async function clearCartCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(CART_COOKIE);
}

export async function getCartItemCount(): Promise<number> {
  const lines = await readCartLines();
  return lines.reduce((acc, l) => acc + l.cantidad, 0);
}

export async function resolveCart(lines?: CartLine[]): Promise<ResolvedCart> {
  const cartLines = lines ?? (await readCartLines());
  if (cartLines.length === 0) {
    return { lines: [], items: [], itemCount: 0, subtotal: 0, canCheckout: false };
  }

  const products = await prisma.producto.findMany({
    where: {
      id_producto: { in: cartLines.map((l) => l.id_producto) },
      activo: true,
    },
    include: {
      precios: true,
      stocks: true,
      archivos: { include: { archivo: true }, take: 1 },
    },
  });

  const byId = new Map(products.map((p) => [p.id_producto, p]));
  const items: ResolvedCartItem[] = [];
  let subtotal = 0;
  let canCheckout = cartLines.length > 0;

  for (const line of cartLines) {
    const product = byId.get(line.id_producto);
    if (!product) {
      items.push({
        id_producto: line.id_producto,
        titulo: `Producto #${line.id_producto}`,
        cantidad: line.cantidad,
        precio: null,
        stockTotal: 0,
        imagen: null,
        subtotal: null,
        disponible: false,
      });
      canCheckout = false;
      continue;
    }

    const precio = pickCurrentPrice(product.precios);
    const stockTotal = product.stocks.reduce((acc, s) => acc + Number(s.cantidad), 0);
    const disponible =
      precio != null && stockTotal > 0 && line.cantidad <= stockTotal && line.cantidad > 0;
    const lineSubtotal = precio != null ? precio * line.cantidad : null;
    if (lineSubtotal != null && disponible) subtotal += lineSubtotal;
    if (!disponible) canCheckout = false;

    items.push({
      id_producto: product.id_producto,
      titulo: product.titulo,
      cantidad: line.cantidad,
      precio,
      stockTotal,
      imagen: product.archivos[0]?.archivo.link ?? null,
      subtotal: lineSubtotal,
      disponible,
    });
  }

  return {
    lines: cartLines,
    items,
    itemCount: cartLines.reduce((acc, l) => acc + l.cantidad, 0),
    subtotal,
    canCheckout,
  };
}

/** Descuenta stock repartiendo entre almacenes con más cantidad primero. */
export async function deductStock(
  tx: Prisma.TransactionClient,
  id_producto: number,
  cantidad: number
) {
  const stocks = await tx.stock.findMany({
    where: { id_producto, cantidad: { gt: 0 } },
    orderBy: { cantidad: "desc" },
  });
  let remaining = cantidad;
  for (const row of stocks) {
    if (remaining <= 0) break;
    const available = Number(row.cantidad);
    const take = Math.min(available, remaining);
    await tx.stock.update({
      where: {
        id_producto_id_almacen: {
          id_producto,
          id_almacen: row.id_almacen,
        },
      },
      data: { cantidad: available - take },
    });
    remaining -= take;
  }
  if (remaining > 0) {
    throw new Error(`Stock insuficiente para el producto ${id_producto}`);
  }
}
