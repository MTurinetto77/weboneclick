import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { createCategoria } from "../actions";

export default async function AdminCategoriasPage() {
  await requireAdmin();
  const categorias = await prisma.categoria.findMany({
    include: {
      superior: true,
      caracteristicas: true,
      _count: { select: { productos: true, subcategorias: true } },
    },
    orderBy: [{ nivel: "asc" }, { nombre: "asc" }],
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
          <h1 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Categorías</h1>
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            Jerarquía del catálogo. Nivel menor = más general.
          </p>
        </div>
      </div>

      <form
        action={createCategoria}
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
        <div className="form-field" style={{ margin: 0, minWidth: "5rem" }}>
          <label>Nivel</label>
          <input name="nivel" type="number" min="1" defaultValue={1} required />
        </div>
        <div className="form-field" style={{ margin: 0, minWidth: "10rem", flex: "1 1 10rem" }}>
          <label>Categoría superior</label>
          <select name="id_cat_superior" defaultValue="">
            <option value="">Ninguna</option>
            {categorias.map((c) => (
              <option key={c.id_categoria} value={c.id_categoria}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" type="submit" style={{ padding: "0.35rem 0.75rem" }}>
          Crear
        </button>
      </form>

      <table className="table table-compact">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Nivel</th>
            <th>Superior</th>
            <th>Características</th>
            <th>Productos</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {categorias.map((cat) => (
            <tr key={cat.id_categoria}>
              <td>{cat.id_categoria}</td>
              <td style={{ paddingLeft: `${(cat.nivel - 1) * 0.75 + 0.5}rem` }}>{cat.nombre}</td>
              <td>{cat.nivel}</td>
              <td>{cat.superior?.nombre ?? "—"}</td>
              <td>{cat.caracteristicas.length}</td>
              <td>{cat._count.productos}</td>
              <td>
                <Link href={`/admin/categorias/${cat.id_categoria}`}>Editar</Link>
              </td>
            </tr>
          ))}
          {!categorias.length && (
            <tr>
              <td colSpan={7} className="muted">
                No hay categorías cargadas.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
