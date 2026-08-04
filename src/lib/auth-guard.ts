import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const ADMIN_ROLE = "admin";
export const VENDEDOR_ROLE = "vendedor";

export function isAdmin(role?: string | null): boolean {
  return role === ADMIN_ROLE;
}

export function canAccessAdminPanel(role?: string | null): boolean {
  return role === ADMIN_ROLE || role === VENDEDOR_ROLE;
}

export function canAccessVentas(role?: string | null): boolean {
  return role === ADMIN_ROLE || role === VENDEDOR_ROLE;
}

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user.role)) {
    redirect("/admin/login");
  }
  return session;
}

/** Para rutas API: 401 JSON en lugar de redirect HTML. */
export async function requireAdminApi() {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user.role)) {
    return null;
  }
  return session;
}

/** Admin o vendedor: listado/detalle de ventas. */
export async function requireVentasAccess() {
  const session = await auth();
  if (!session?.user || !canAccessVentas(session.user.role)) {
    redirect("/admin/login");
  }
  return session;
}

/** Admin o vendedor para APIs de ventas (p.ej. sync Odoo). */
export async function requireVentasApi() {
  const session = await auth();
  if (!session?.user || !canAccessVentas(session.user.role)) {
    return null;
  }
  return session;
}
