import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { createTienda, deleteTienda } from "@/app/admin/cms-actions";

export default async function AdminTiendasPage() {
  await requireAdmin();
  const tiendas = await prisma.tienda.findMany({ orderBy: { nombre: "asc" } });

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Tiendas</h1>
      <form action={createTienda} className="admin-card" style={{ display: "grid", gap: "0.55rem", marginBottom: "1.25rem" }}>
        <h3 style={{ margin: 0 }}>Nueva tienda</h3>
        <input name="nombre" placeholder="Nombre" required />
        <input name="slug" placeholder="Slug (opcional)" />
        <input name="direccion" placeholder="Dirección" required />
        <input name="localidad" placeholder="Localidad" required />
        <input name="provincia" placeholder="Provincia" required />
        <input name="telefono" placeholder="Teléfono" />
        <textarea name="horarios" placeholder="Horarios" rows={2} />
        <button type="submit" className="btn btn-primary">
          Crear
        </button>
      </form>
      <table className="table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Dirección</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {tiendas.map((t) => (
            <tr key={t.id_tienda}>
              <td>{t.nombre}</td>
              <td>
                {t.direccion}, {t.localidad}
              </td>
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
