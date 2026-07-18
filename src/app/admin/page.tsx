import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { syncOdooAction } from "@/app/admin/sync-actions";

export const metadata = { title: "Admin" };

export default async function AdminDashboardPage() {
  await requireAdmin();

  const [productos, activos, categorias, marcas, banners, tiendas, almacenes] = await Promise.all([
    prisma.producto.count(),
    prisma.producto.count({ where: { activo: true } }),
    prisma.categoria.count(),
    prisma.marca.count(),
    prisma.banner.count(),
    prisma.tienda.count(),
    prisma.almacen.count(),
  ]);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Dashboard</h1>
      <p className="muted">Gestión de catálogo OneClick Store (sincronizado con Odoo).</p>
      <div className="stats">
        <div className="stat">
          <span className="muted">Productos</span>
          <strong>{productos}</strong>
        </div>
        <div className="stat">
          <span className="muted">Activos</span>
          <strong>{activos}</strong>
        </div>
        <div className="stat">
          <span className="muted">Categorías</span>
          <strong>{categorias}</strong>
        </div>
        <div className="stat">
          <span className="muted">Marcas</span>
          <strong>{marcas}</strong>
        </div>
        <div className="stat">
          <span className="muted">Banners</span>
          <strong>{banners}</strong>
        </div>
        <div className="stat">
          <span className="muted">Tiendas</span>
          <strong>{tiendas}</strong>
        </div>
        <div className="stat">
          <span className="muted">Almacenes</span>
          <strong>{almacenes}</strong>
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: "1.5rem" }}>
        <h2 style={{ marginTop: 0 }}>Sincronizar con Odoo</h2>
        <p className="muted">
          Importa categorías, almacenes, marcas, etiquetas, productos publicados web y precios
          (compañía Argentina).
        </p>
        <form action={syncOdooAction}>
          <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.75rem" }}>
            <input type="checkbox" name="skip_images" value="1" defaultChecked />
            Omitir imágenes (más rápido)
          </label>
          <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.75rem" }}>
            <input type="checkbox" name="skip_stock" value="1" defaultChecked />
            Omitir stock
          </label>
          <button type="submit" className="btn btn-primary">
            Sincronizar con Odoo
          </button>
        </form>
      </div>
    </div>
  );
}
