import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { createAlmacen, deleteAlmacen, updateAlmacen } from "../actions";

export default async function AdminAlmacenesPage() {
  await requireAdmin();
  const almacenes = await prisma.almacen.findMany({
    include: {
      _count: { select: { stocks: true } },
    },
    orderBy: { id_almacen: "asc" },
  });

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Almacenes</h1>
      <div className="admin-card">
        <form action={createAlmacen} className="search-form">
          <input name="descripcion" placeholder="Descripción" required />
          <button className="btn btn-primary" type="submit">
            Crear
          </button>
        </form>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Descripción</th>
            <th>Productos</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {almacenes.map((a) => {
            const canDelete = a._count.stocks === 0;
            return (
              <tr key={a.id_almacen}>
                <td>{a.id_almacen}</td>
                <td>
                  <form action={updateAlmacen.bind(null, a.id_almacen)} className="search-form">
                    <input name="descripcion" defaultValue={a.descripcion} required />
                    <button className="btn btn-secondary" type="submit">
                      Guardar
                    </button>
                  </form>
                </td>
                <td>{a._count.stocks}</td>
                <td>
                  {canDelete ? (
                    <form action={deleteAlmacen.bind(null, a.id_almacen)}>
                      <button className="btn btn-ghost" type="submit">
                        Eliminar
                      </button>
                    </form>
                  ) : (
                    <span className="muted" title="Tiene productos con stock asociados">
                      No eliminable
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
