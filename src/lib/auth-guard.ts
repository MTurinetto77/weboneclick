import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/admin/login");
  }
  return session;
}

/** Para rutas API: 401 JSON en lugar de redirect HTML. */
export async function requireAdminApi() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return null;
  }
  return session;
}
