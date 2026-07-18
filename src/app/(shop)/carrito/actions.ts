"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  readCartLines,
  writeCartLines,
  clearCartCookie,
  type CartLine,
} from "@/lib/cart";

async function stockTotal(id_producto: number): Promise<number> {
  const stocks = await prisma.stock.findMany({ where: { id_producto } });
  return stocks.reduce((acc, s) => acc + Number(s.cantidad), 0);
}

function upsertLine(lines: CartLine[], id_producto: number, cantidad: number): CartLine[] {
  const next = lines.filter((l) => l.id_producto !== id_producto);
  if (cantidad > 0) next.push({ id_producto, cantidad });
  return next;
}

export async function addToCart(formData: FormData) {
  const id_producto = Number(formData.get("id_producto"));
  const cantidad = Math.max(1, Math.floor(Number(formData.get("cantidad") || 1)));
  if (!id_producto) throw new Error("Producto inválido");

  const product = await prisma.producto.findFirst({
    where: { id_producto, activo: true },
  });
  if (!product) throw new Error("Producto no disponible");

  const available = await stockTotal(id_producto);
  // Si aún no hay stock sincronizado, permitir agregar (catálogo Odoo en progreso)
  const lines = await readCartLines();
  const existing = lines.find((l) => l.id_producto === id_producto)?.cantidad ?? 0;
  const max = available > 0 ? available : existing + cantidad + 99;
  const desired = Math.min(max, existing + cantidad);
  await writeCartLines(upsertLine(lines, id_producto, desired));

  revalidatePath("/carrito");
  revalidatePath("/shop");
  revalidatePath("/");

  // Desde cards del loop: quedar en la página (como ajax del sitio original)
  if (String(formData.get("stay") || "") === "1") {
    return;
  }

  redirect("/carrito");
}

export async function updateQuantity(formData: FormData) {
  const id_producto = Number(formData.get("id_producto"));
  const cantidad = Math.floor(Number(formData.get("cantidad") || 0));
  if (!id_producto) throw new Error("Producto inválido");

  const available = await stockTotal(id_producto);
  const lines = await readCartLines();
  const nextQty = Math.max(0, Math.min(available, cantidad));
  await writeCartLines(upsertLine(lines, id_producto, nextQty));

  revalidatePath("/carrito");
  revalidatePath("/");
}

export async function removeFromCart(formData: FormData) {
  const id_producto = Number(formData.get("id_producto"));
  if (!id_producto) throw new Error("Producto inválido");
  const lines = await readCartLines();
  await writeCartLines(lines.filter((l) => l.id_producto !== id_producto));
  revalidatePath("/carrito");
  revalidatePath("/");
}

export async function clearCart() {
  await clearCartCookie();
  revalidatePath("/carrito");
  revalidatePath("/");
}
