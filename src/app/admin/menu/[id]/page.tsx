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
import { ChildEditModal } from "../child-modal";

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

  const updateAction = updateMenuItem.bind(null, id);
  const deleteAction = deleteMenuItem.bind(null, id);

  return (
    <div>
      <Link href="/admin/menu" style={{ fontSize: "0.85rem" }}>
        ← Menú principal
      </Link>

      <h1 style={{ marginTop: "0.5rem", marginBottom: "0.75rem" }}>
        Editar: {item.label}
        {item.tipo === "fijo" && (
          <span
            style={{
              fontSize: "0.75rem",
              marginLeft: "0.5rem",
              padding: "0.15rem 0.5rem",
              borderRadius: "4px",
              background: "#e8d44d33",
            }}
          >
            fijo
          </span>
        )}
      </h1>

      <form action={updateAction} style={{ maxWidth: 520 }}>
        <fieldset style={{ border: "1px solid #ddd", padding: "1rem", borderRadius: "6px" }}>
          <legend>Item principal</legend>

          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Label
            <input type="text" name="label" defaultValue={item.label} required className="input" style={{ width: "100%", marginTop: "0.2rem" }} />
          </label>

          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Href
            <input type="text" name="href" defaultValue={item.href} required className="input" style={{ width: "100%", marginTop: "0.2rem" }} />
          </label>

          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Shop label (CTA del panel)
            <input type="text" name="shop_label" defaultValue={item.shop_label ?? ""} className="input" style={{ width: "100%", marginTop: "0.2rem" }} />
          </label>

          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Badge (tag amarillo)
            <input type="text" name="badge" defaultValue={item.badge ?? ""} className="input" style={{ width: "100%", marginTop: "0.2rem" }} placeholder="ej. Nuevas" />
          </label>

          {item.tipo !== "fijo" && (
            <label style={{ display: "block", marginBottom: "0.5rem" }}>
              Tipo
              <select name="tipo" defaultValue={item.tipo} className="input" style={{ width: "100%", marginTop: "0.2rem" }}>
                <option value="dinamico">Dinamico</option>
                <option value="fijo">Fijo</option>
              </select>
            </label>
          )}

          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Dynamic children
            <input type="text" name="dynamic_children" defaultValue={item.dynamic_children ?? ""} className="input" style={{ width: "100%", marginTop: "0.2rem" }} placeholder='ej. "promociones" para carga dinamica' />
          </label>

          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Orden
            <input type="number" name="orden" defaultValue={item.orden} className="input" style={{ width: "100%", marginTop: "0.2rem" }} />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.75rem" }}>
            <input type="checkbox" name="activo" defaultChecked={item.activo} />
            Activo
          </label>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="submit" className="btn btn-primary">Guardar</button>
            {item.tipo !== "fijo" && (
              <button type="submit" formAction={deleteAction} className="btn btn-danger">Eliminar item</button>
            )}
          </div>
        </fieldset>
      </form>

      {/* ---- Children ---- */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "1.5rem", marginBottom: "0.5rem" }}>
        <h2 style={{ margin: 0 }}>Sub-items ({item.hijos.length})</h2>
        <ChildEditModal idMenuItem={id} child={null} upsertAction={upsertMenuChild} trigger={
          <span className="btn btn-primary" style={{ padding: "0.25rem 0.6rem", fontSize: "0.8rem" }}>+ Agregar</span>
        } />
      </div>

      <table className="table table-compact">
        <thead>
          <tr>
            <th style={{ width: 50 }}>Ord.</th>
            <th>Label</th>
            <th>Href</th>
            <th>Badge</th>
            <th>Variant</th>
            <th style={{ width: 40 }}>Act.</th>
            <th style={{ width: 130 }} />
          </tr>
        </thead>
        <tbody>
          {item.hijos.map((h, idx) => (
            <tr key={h.id_menu_hijo} style={{ opacity: h.activo ? 1 : 0.5 }}>
              <td>{h.orden}</td>
              <td>{h.label}</td>
              <td style={{ fontSize: "0.8rem" }}>{h.href}</td>
              <td>
                {h.badge ? (
                  <span style={{ fontSize: "0.75rem", padding: "0.1rem 0.4rem", borderRadius: "4px", background: "#e8d44d", color: "#000" }}>{h.badge}</span>
                ) : "—"}
              </td>
              <td style={{ fontSize: "0.8rem" }}>{h.variant}</td>
              <td style={{ textAlign: "center" }}>{h.activo ? "✅" : "❌"}</td>
              <td style={{ display: "flex", gap: "0.2rem", alignItems: "center", flexWrap: "nowrap" }}>
                <ChildEditModal idMenuItem={id} child={h} upsertAction={upsertMenuChild} trigger={
                  <span className="btn btn-sm" style={{ padding: "0.15rem 0.4rem" }}>Editar</span>
                } />
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
          ))}
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
