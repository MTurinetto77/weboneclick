"use server";

import { revalidatePath } from "next/cache";
import {
  clearCuponCookie,
  validateCupon,
  writeCuponCookie,
} from "@/lib/cupones";

export type AplicarCuponResult =
  | { ok: true; codigo: string; monto: number }
  | { ok: false; message: string };

export async function aplicarCuponAction(codigoRaw: string): Promise<AplicarCuponResult> {
  const result = await validateCupon(codigoRaw);
  if (!result.ok) return result;

  await writeCuponCookie(result.cupon.codigo);
  revalidatePath("/carrito");
  revalidatePath("/checkout");
  return {
    ok: true,
    codigo: result.cupon.codigo,
    monto: result.cupon.monto,
  };
}

export async function quitarCuponAction(): Promise<void> {
  await clearCuponCookie();
  revalidatePath("/carrito");
  revalidatePath("/checkout");
}
