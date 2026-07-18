import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { deleteCategoria, updateCategoria } from "../../actions";

type Params = Promise<{ id: string }>;

export default async function AdminCategoriaDetailPage({ params }: { params: Params }) {
  await requireAdmin();
  const { id } = await params;
  const id_categoria = Number(id);

  const [categoria, categorias, caracteristicas] = await Promise.all([
    prisma.categoria.findUnique({
      where: { id_categoria },
      include: {
        caracteristicas: { include: { caracteristica: true } },
        superior: true,
      },
    }),
    prisma.categoria.findMany({
      orderBy: [{ nivel: "asc" }, { nombre: "asc" }],
    }),
    prisma.caracteristica.findMany({ orderBy: { nombre: "asc" } }),
  ]);

  if (!categoria) notFound();

  const selected = new Set(categoria.caracteristicas.map((c) => c.id_caracteristica));

  return (
    <div>
      <p>
        <Link href="/admin/categorias">← Categorías</Link>
      </p>
      <h1 style={{ marginTop: 0 }}>Editar categoría #{categoria.id_categoria}</h1>

      <div className="admin-card">
        <form action={updateCategoria.bind(null, id_categoria)}>
          <div className="form-field">
            <label>Nombre</label>
            <input name="nombre" defaultValue={categoria.nombre} required />
          </div>
          <div className="form-field">
            <label>Nivel</label>
            <input name="nivel" type="number" min="1" defaultValue={categoria.nivel} required />
          </div>
          <div className="form-field">
            <label>Categoría superior</label>
            <select name="id_cat_superior" defaultValue={categoria.id_cat_superior ?? ""}>
              <option value="">Ninguna</option>
              {categorias
                .filter((c) => c.id_categoria !== categoria.id_categoria)
                .map((c) => (
                  <option key={c.id_categoria} value={c.id_categoria}>
                    {c.nombre}
                  </option>
                ))}
            </select>
          </div>

          <h2 style={{ fontSize: "1.1rem", margin: "1.25rem 0 0.75rem" }}>
            Características asociadas
          </h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Marcá las características que aplican a esta categoría.
          </p>

          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: "4rem" }}>Asociar</th>
                <th>ID</th>
                <th>Nombre</th>
              </tr>
            </thead>
            <tbody>
              {caracteristicas.length === 0 ? (
                <tr>
                  <td colSpan={3} className="muted">
                    No hay características cargadas. Crealas en{" "}
                    <Link href="/admin/caracteristicas">Características</Link>.
                  </td>
                </tr>
              ) : (
                caracteristicas.map((c) => (
                  <tr key={c.id_caracteristica}>
                    <td>
                      <input
                        type="checkbox"
                        name="caracteristicas"
                        value={c.id_caracteristica}
                        defaultChecked={selected.has(c.id_caracteristica)}
                        aria-label={`Asociar ${c.nombre}`}
                      />
                    </td>
                    <td>{c.id_caracteristica}</td>
                    <td>{c.nombre}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="actions">
            <button className="btn btn-primary" type="submit">
              Guardar
            </button>
          </div>
        </form>
      </div>

      <form action={deleteCategoria.bind(null, id_categoria)}>
        <button className="btn btn-ghost" type="submit">
          Eliminar categoría
        </button>
      </form>
    </div>
  );
}
