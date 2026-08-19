import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { toggleMenuItem, moveMenuItem, deleteMenuItem, createMenuItem } from "./actions";
import { MenuItemModal } from "./menu-item-modal";
import { ConfirmDeleteForm } from "./confirm-delete-form";

export default async function AdminMenuPage() {
  await requireAdmin();
  const items = await prisma.menu_item.findMany({
    orderBy: { orden: "asc" },
    include: { _count: { select: { hijos: true } } },
  });

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          alignItems: "center",
          marginBottom: "0.85rem",
        }}
      >
        <div style={{ flex: "1 1 auto" }}>
          <h1 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Menú principal</h1>
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            Items de navegación del sitio. Orden menor = primero. Los items fijos solo se pueden
            activar/desactivar.
          </p>
        </div>
        <MenuItemModal
          kind="item"
          data={null}
          action={createMenuItem as never}
          trigger={<span className="btn btn-primary" style={{ padding: "0.35rem 0.75rem" }}>+ Crear</span>}
        />
      </div>

      <table className="table table-compact">
        <thead>
          <tr>
            <th>Orden</th>
            <th>Label</th>
            <th>Href</th>
            <th>Tipo</th>
            <th>Badge</th>
            <th>Hijos</th>
            <th>Activo</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={item.id_menu_item} style={{ opacity: item.activo ? 1 : 0.5 }}>
              <td>{item.orden}</td>
              <td>
                <Link href={`/admin/menu/${item.id_menu_item}`}>{item.label}</Link>
              </td>
              <td style={{ fontSize: "0.8rem" }}>{item.href}</td>
              <td>
                <span
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.1rem 0.4rem",
                    borderRadius: "4px",
                    background: item.tipo === "fijo" ? "#e8d44d33" : "#4dabf733",
                  }}
                >
                  {item.tipo}
                </span>
              </td>
              <td>
                {item.badge ? (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      padding: "0.1rem 0.4rem",
                      borderRadius: "4px",
                      background: "#e8d44d",
                      color: "#000",
                    }}
                  >
                    {item.badge}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td>{item._count.hijos}</td>
              <td>
                <form action={toggleMenuItem.bind(null, item.id_menu_item)}>
                  <button
                    type="submit"
                    title={item.activo ? "Desactivar" : "Activar"}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "1.1rem",
                    }}
                  >
                    {item.activo ? "✅" : "❌"}
                  </button>
                </form>
              </td>
              <td style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
                {idx > 0 && (
                  <form action={moveMenuItem.bind(null, item.id_menu_item, "up")}>
                    <button type="submit" className="btn btn-sm" title="Subir">
                      ▲
                    </button>
                  </form>
                )}
                {idx < items.length - 1 && (
                  <form action={moveMenuItem.bind(null, item.id_menu_item, "down")}>
                    <button type="submit" className="btn btn-sm" title="Bajar">
                      ▼
                    </button>
                  </form>
                )}
                <Link
                  href={`/admin/menu/${item.id_menu_item}`}
                  className="btn btn-sm"
                  style={{ padding: "0.15rem 0.4rem" }}
                >
                  Editar
                </Link>
                {item.tipo !== "fijo" && (
                  <ConfirmDeleteForm
                    action={deleteMenuItem.bind(null, item.id_menu_item)}
                    message="¿Eliminar este item del menú?"
                  >
                    <button type="submit" className="btn btn-sm btn-danger">
                      ✕
                    </button>
                  </ConfirmDeleteForm>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
