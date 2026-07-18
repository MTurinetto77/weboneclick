"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-guard";

export async function syncOdooAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const skipImages = formData.get("skip_images") === "1";
  const skipStock = formData.get("skip_stock") === "1";
  const { runFullSync } = await import("@/lib/odoo-sync");
  const stats = await runFullSync({ skipImages, skipStock });
  console.log("Odoo sync from admin:", JSON.stringify(stats));
  revalidatePath("/admin");
  revalidatePath("/shop");
  revalidatePath("/");
}
