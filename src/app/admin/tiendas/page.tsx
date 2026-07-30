import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { createTienda, deleteTienda } from "@/app/admin/cms-actions";

export default async function AdminTiendasPage() {
  await requireAdmin();
  const tiendas = await prisma.tienda.findMany({
    orderBy: [{ activo: "desc" }, { orden: "asc" }, { nombre: "asc" }],
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
          <h1 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Tiendas</h1>
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            Puntos de retiro y showrooms. Orden menor = primero en el listado.
          </p>
        </div>
      </div>

      <form
        action={createTienda}
        className="admin-card"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.65rem",
          alignItems: "flex-end",
          marginBottom: "0.85rem",
          padding: "0.75rem",
        }}
      >
        <div className="form-field" style={{ margin: 0, minWidth: "10rem", flex: "1 1 10rem" }}>
          <label>Nombre</label>
          <input name="nombre" required />
        </div>
        <div className="form-field" style={{ margin: 0, minWidth: "8rem", flex: "1 1 8rem" }}>
          <label>Slug</label>
          <input name="slug" placeholder="Opcional" />
        </div>
        <div className="form-field" style={{ margin: 0, minWidth: "12rem", flex: "2 1 12rem" }}>
          <label>Dirección</label>
          <input name="direccion" required />
        </div>
        <div className="form-field" style={{ margin: 0, minWidth: "8rem", flex: "1 1 8rem" }}>
          <label>Dirección corta</label>
          <input name="direccion_corta" placeholder="Listados" />
        </div>
        <div className="form-field" style={{ margin: 0, minWidth: "8rem" }}>
          <label>Localidad</label>
          <input name="localidad" required />
        </div>
        <div className="form-field" style={{ margin: 0, minWidth: "8rem" }}>
          <label>Provincia</label>
          <input name="provincia" required />
        </div>
        <div className="form-field" style={{ margin: 0, minWidth: "6rem" }}>
          <label>CP</label>
          <input name="codigo_postal" />
        </div>
        <div className="form-field" style={{ margin: 0, minWidth: "10rem" }}>
          <label>Email</label>
          <input name="email" type="email" />
        </div>
        <div className="form-field" style={{ margin: 0, minWidth: "8rem" }}>
          <label>Teléfono</label>
          <input name="telefono" />
        </div>
        <div className="form-field" style={{ margin: 0, minWidth: "5rem" }}>
          <label>Orden</label>
          <input name="orden" type="number" defaultValue={0} />
        </div>
        <div className="form-field" style={{ margin: 0, minWidth: "14rem", flex: "2 1 14rem" }}>
          <label>Horarios</label>
          <textarea name="horarios" rows={2} />
        </div>
        <button type="submit" className="btn btn-primary" style={{ padding: "0.35rem 0.75rem" }}>
          Crear
        </button>
      </form>

      <table className="table table-compact">
        <thead>
          <tr>
            <th>Orden</th>
            <th>Nombre</th>
            <th>Dirección</th>
            <th>CP</th>
            <th>Tel / Email</th>
            <th>Activa</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {tiendas.map((t) => (
            <tr key={t.id_tienda} style={{ opacity: t.activo ? 1 : 0.45 }}>
              <td>{t.orden}</td>
              <td>{t.nombre}</td>
              <td>{t.direccion}</td>
              <td>{t.codigo_postal || "—"}</td>
              <td>
                {t.telefono || "—"}
                <br />
                <span className="muted">{t.email || "—"}</span>
              </td>
              <td>{t.activo ? "Sí" : "No"}</td>
              <td>
                <form action={deleteTienda.bind(null, t.id_tienda)}>
                  <button
                    type="submit"
                    className="btn btn-ghost"
                    style={{ padding: "0.15rem 0.45rem", fontSize: "0.8rem" }}
                  >
                    Eliminar
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {!tiendas.length && (
            <tr>
              <td colSpan={7} className="muted">
                No hay tiendas cargadas.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
