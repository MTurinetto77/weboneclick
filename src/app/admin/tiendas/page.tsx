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
      <h1 style={{ marginTop: 0 }}>Tiendas</h1>
      <form
        action={createTienda}
        className="admin-card"
        style={{ display: "grid", gap: "0.55rem", marginBottom: "1.25rem" }}
      >
        <h3 style={{ margin: 0 }}>Nueva tienda</h3>
        <input name="nombre" placeholder="Nombre" required />
        <input name="slug" placeholder="Slug (opcional)" />
        <input name="direccion" placeholder="Dirección completa" required />
        <input name="direccion_corta" placeholder="Dirección corta (listados)" />
        <input name="localidad" placeholder="Localidad" required />
        <input name="provincia" placeholder="Provincia" required />
        <input name="codigo_postal" placeholder="Código postal" />
        <input name="email" type="email" placeholder="Email" />
        <input name="telefono" placeholder="Teléfono" />
        <input name="orden" type="number" placeholder="Orden" defaultValue={0} />
        <textarea name="horarios" placeholder="Horarios" rows={2} />
        <button type="submit" className="btn btn-primary">
          Crear
        </button>
      </form>
      <table className="table">
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
                {t.email || "—"}
              </td>
              <td>{t.activo ? "Sí" : "No"}</td>
              <td>
                <form action={deleteTienda.bind(null, t.id_tienda)}>
                  <button type="submit" className="btn btn-ghost">
                    Eliminar
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
