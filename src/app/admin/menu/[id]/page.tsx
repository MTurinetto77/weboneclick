import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import {
  updateMenuItem,
  deleteMenuItem,
  upsertMenuChild,
  deleteMenuChild,
  moveMenuChild,
} from "../actions";
import { MenuItemModal, type MenuItemData } from "../menu-item-modal";

export default async function AdminMenuEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isFinite(id)) notFound();

  const item = await prisma.menu_item.findUnique({
    where: { id_menu_item: id },
    include: { hijos: { orderBy: { orden: "asc" } } },
  });
  if (!item) notFound();

  const itemData: MenuItemData = {
    id: item.id_menu_item,
    label: item.label,
    href: item.href,
    id_categoria: item.id_categoria,
    shop_label: item.shop_label,
    badge: item.badge,
    tipo: item.tipo,
    dynamic_children: item.dynamic_children,
    orden: item.orden,
    activo: item.activo,
  };

  const updateAction = updateMenuItem.bind(null, id);
  const deleteAction = deleteMenuItem.bind(null, id);

  return (
    <div>
      <Link href="/admin/menu" style={{ fontSize: "0.85rem" }}>
        ← Menú principal
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.5rem", marginBottom: "0.75rem" }}>
        <h1 style={{ margin: 0 }}>
          {item.label}
          {item.tipo === "fijo" && (
            <span style={{ fontSize: "0.75rem", marginLeft: "0.5rem", padding: "0.15rem 0.5rem", borderRadius: "4px", background: "#e8d44d33" }}>
              fijo
            </span>
          )}
        </h1>
        <MenuItemModal
          kind="item"
          data={itemData}
          action={updateAction as never}
          trigger={<span className="btn btn-sm" style={{ padding: "0.2rem 0.5rem" }}>Editar item</span>}
        />
        {item.tipo !== "fijo" && (
          <form action={deleteAction} style={{ display: "inline" }}>
            <button type="submit" className="btn btn-sm btn-danger" style={{ padding: "0.2rem 0.5rem" }}>
              Eliminar
            </button>
          </form>
        )}
      </div>

      <table className="table table-compact" style={{ marginBottom: "0.75rem", maxWidth: 600 }}>
        <tbody>
          <tr><td style={{ fontWeight: 600, width: 140 }}>Href</td><td>{item.href}</td></tr>
          <tr><td style={{ fontWeight: 600 }}>Shop label</td><td>{item.shop_label ?? "—"}</td></tr>
          <tr><td style={{ fontWeight: 600 }}>Badge</td><td>{item.badge ?? "—"}</td></tr>
          <tr><td style={{ fontWeight: 600 }}>Tipo</td><td>{item.tipo}</td></tr>
          <tr><td style={{ fontWeight: 600 }}>Dynamic children</td><td>{item.dynamic_children ?? "—"}</td></tr>
          <tr><td style={{ fontWeight: 600 }}>Orden</td><td>{item.orden}</td></tr>
          <tr><td style={{ fontWeight: 600 }}>Activo</td><td>{item.activo ? "✅" : "❌"}</td></tr>
        </tbody>
      </table>

      {/* ---- Children ---- */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "1.5rem", marginBottom: "0.5rem" }}>
        <h2 style={{ margin: 0 }}>Sub-items ({item.hijos.length})</h2>
        <MenuItemModal
          kind="child"
          parentId={id}
          data={null}
          action={upsertMenuChild as never}
          trigger={<span className="btn btn-primary" style={{ padding: "0.25rem 0.6rem", fontSize: "0.8rem" }}>+ Agregar</span>}
        />
      </div>

      <table className="table table-compact">
        <thead>
          <tr>
            <th style={{ width: 50 }}>Ord.</th>
            <th>Label</th>
            <th>Href</th>
            <th>Badge</th>
            <th>Estilo</th>
            <th style={{ width: 40 }}>Act.</th>
            <th style={{ width: 150 }} />
          </tr>
        </thead>
        <tbody>
          {item.hijos.map((h, idx) => {
            const childData: MenuItemData = {
              id: h.id_menu_hijo,
              label: h.label,
              href: h.href,
              id_categoria: h.id_categoria,
              badge: h.badge,
              icon: h.icon,
              variant: h.variant,
              orden: h.orden,
              activo: h.activo,
            };
            return (
              <tr key={h.id_menu_hijo} style={{ opacity: h.activo ? 1 : 0.5 }}>
                <td>{h.orden}</td>
                <td>{h.label}</td>
                <td style={{ fontSize: "0.8rem" }}>{h.href}</td>
                <td>
                  {h.badge ? (
                    <span style={{ fontSize: "0.75rem", padding: "0.1rem 0.4rem", borderRadius: "4px", background: "#e8d44d", color: "#000" }}>{h.badge}</span>
                  ) : "—"}
                </td>
                <td style={{ fontSize: "0.8rem" }}>{h.variant === "link" ? "Secundario" : "Destacado"}</td>
                <td style={{ textAlign: "center" }}>{h.activo ? "✅" : "❌"}</td>
                <td style={{ display: "flex", gap: "0.2rem", alignItems: "center", flexWrap: "nowrap" }}>
                  <MenuItemModal
                    kind="child"
                    parentId={id}
                    data={childData}
                    action={upsertMenuChild as never}
                    trigger={<span className="btn btn-sm" style={{ padding: "0.15rem 0.4rem" }}>Editar</span>}
                  />
                  {idx > 0 && (
                    <form action={moveMenuChild.bind(null, h.id_menu_hijo, id, "up")} style={{ display: "inline" }}>
                      <button type="submit" className="btn btn-sm" style={{ padding: "0.15rem 0.3rem" }}>▲</button>
                    </form>
                  )}
                  {idx < item.hijos.length - 1 && (
                    <form action={moveMenuChild.bind(null, h.id_menu_hijo, id, "down")} style={{ display: "inline" }}>
                      <button type="submit" className="btn btn-sm" style={{ padding: "0.15rem 0.3rem" }}>▼</button>
                    </form>
                  )}
                  <form action={deleteMenuChild.bind(null, h.id_menu_hijo, id)} style={{ display: "inline" }}>
                    <button type="submit" className="btn btn-sm btn-danger" style={{ padding: "0.15rem 0.3rem" }}>✕</button>
                  </form>
                </td>
              </tr>
            );
          })}
          {item.hijos.length === 0 && (
            <tr>
              <td colSpan={7} style={{ textAlign: "center", color: "#999" }}>Sin sub-items</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
