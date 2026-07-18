import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { createCaracteristica, deleteCaracteristica } from "../actions";

export default async function AdminCaracteristicasPage() {
  await requireAdmin();
  const items = await prisma.caracteristica.findMany({
    include: {
      _count: {
        select: {
          productos: true,
          categorias: true,
        },
      },
    },
    orderBy: { nombre: "asc" },
  });

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Características</h1>

      <div className="admin-card">
        <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Nueva característica</h2>
        <form action={createCaracteristica} className="search-form">
          <input name="nombre" placeholder="Nombre" required />
          <button className="btn btn-primary" type="submit">
            Crear
          </button>
        </form>
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Productos</th>
            <th>Categorías</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const canDelete = item._count.productos === 0;
            return (
              <tr key={item.id_caracteristica}>
                <td>{item.id_caracteristica}</td>
                <td>{item.nombre}</td>
                <td>{item._count.productos}</td>
                <td>{item._count.categorias}</td>
                <td>
                  <div className="actions" style={{ marginTop: 0 }}>
                    <Link href={`/admin/caracteristicas/${item.id_caracteristica}`}>Editar</Link>
                    {canDelete ? (
                      <form action={deleteCaracteristica.bind(null, item.id_caracteristica)}>
                        <button className="btn btn-ghost" type="submit">
                          Eliminar
                        </button>
                      </form>
                    ) : (
                      <span className="muted" title="Tiene productos asociados">
                        No eliminable
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
