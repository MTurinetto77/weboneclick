import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { OdooSyncPanel } from "@/components/admin/odoo-sync-panel";

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

      <OdooSyncPanel />
    </div>
  );
}
