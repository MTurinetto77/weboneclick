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
      <h1 style={{ marginTop: 0 }}>Categorías</h1>

      <div className="admin-card">
        <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Nueva categoría</h2>
        <form action={createCategoria}>
          <div className="form-field">
            <label>Nombre</label>
            <input name="nombre" required />
          </div>
          <div className="form-field">
            <label>Nivel</label>
            <input name="nivel" type="number" min="1" defaultValue={1} required />
          </div>
          <div className="form-field">
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
              <td style={{ paddingLeft: `${(cat.nivel - 1) * 0.75 + 0.8}rem` }}>{cat.nombre}</td>
              <td>{cat.nivel}</td>
              <td>{cat.superior?.nombre ?? "—"}</td>
              <td>{cat.caracteristicas.length}</td>
              <td>{cat._count.productos}</td>
              <td>
                <Link href={`/admin/categorias/${cat.id_categoria}`}>Editar</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
