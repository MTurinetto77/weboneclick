import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

type SearchParams = Promise<{ q?: string; page?: string }>;

const PAGE_SIZE = 15;

export default async function AdminUsuariosPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const q = params.q?.trim() || undefined;
  const page = Math.max(1, Number(params.page || 1) || 1);

  const where = q
    ? {
        mail: { contains: q },
      }
    : undefined;

  const [usuarios, total] = await Promise.all([
    prisma.usuario.findMany({
      where,
      orderBy: { id_usuario: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.usuario.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function hrefFor(nextPage: number) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (nextPage > 1) sp.set("page", String(nextPage));
    const qs = sp.toString();
    return qs ? `/admin/usuarios?${qs}` : "/admin/usuarios";
  }

  return (
    <div>
      <div className="actions" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Usuarios</h1>
        <Link href="/admin/usuarios/nuevo" className="btn btn-primary">
          Nuevo usuario
        </Link>
      </div>

      <form className="search-form" action="/admin/usuarios" method="get" style={{ marginTop: "1rem" }}>
        <input name="q" defaultValue={q || ""} placeholder="Buscar por mail..." />
        <button className="btn btn-secondary" type="submit">
          Buscar
        </button>
        <Link href="/admin/usuarios" className="btn btn-ghost">
          Limpiar
        </Link>
      </form>

      <p className="muted" style={{ marginTop: 0 }}>
        {total} usuario{total === 1 ? "" : "s"}
        {totalPages > 1 ? ` · página ${page} de ${totalPages}` : ""}
      </p>

      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Mail</th>
            <th>Tipo</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {usuarios.length === 0 ? (
            <tr>
              <td colSpan={5} className="muted">
                No se encontraron usuarios.
              </td>
            </tr>
          ) : (
            usuarios.map((u) => (
              <tr key={u.id_usuario}>
                <td>{u.id_usuario}</td>
                <td>{u.mail}</td>
                <td>{u.tipo_usuario}</td>
                <td>{u.activo ? "Activo" : "Inactivo"}</td>
                <td>
                  <Link href={`/admin/usuarios/${u.id_usuario}`}>Editar</Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="pagination">
          {page > 1 && (
            <Link href={hrefFor(page - 1)} className="btn btn-ghost">
              Anterior
            </Link>
          )}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={hrefFor(p)}
              className={`btn ${p === page ? "btn-secondary" : "btn-ghost"}`}
            >
              {p}
            </Link>
          ))}
          {page < totalPages && (
            <Link href={hrefFor(page + 1)} className="btn btn-ghost">
              Siguiente
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
