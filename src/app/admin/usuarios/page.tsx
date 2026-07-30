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
          <h1 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Usuarios</h1>
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            Cuentas del panel y del sitio. Buscar por correo electrónico.
          </p>
        </div>
        <Link href="/admin/usuarios/nuevo" className="btn btn-primary" style={{ padding: "0.35rem 0.75rem" }}>
          Crear
        </Link>
      </div>

      <form
        method="get"
        action="/admin/usuarios"
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
        <div className="form-field" style={{ margin: 0, minWidth: "12rem", flex: "1 1 12rem" }}>
          <label>Buscar</label>
          <input name="q" defaultValue={q || ""} placeholder="Mail…" />
        </div>
        <button type="submit" className="btn btn-secondary">
          Buscar
        </button>
        <Link href="/admin/usuarios" className="btn btn-ghost">
          Limpiar
        </Link>
      </form>

      <table className="table table-compact">
        <thead>
          <tr>
            <th>ID</th>
            <th>Mail</th>
            <th>Tipo</th>
            <th>Activo</th>
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
                <td>{u.activo ? "Sí" : "No"}</td>
                <td>
                  <Link href={`/admin/usuarios/${u.id_usuario}`}>Editar</Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <p
          className="muted"
          style={{
            display: "flex",
            gap: "0.75rem",
            alignItems: "center",
            marginTop: "0.75rem",
            fontSize: "0.85rem",
          }}
        >
          <span>
            Página {page} de {totalPages} ({total} usuario{total === 1 ? "" : "s"})
          </span>
          {page > 1 && <Link href={hrefFor(page - 1)}>← Anterior</Link>}
          {page < totalPages && <Link href={hrefFor(page + 1)}>Siguiente →</Link>}
        </p>
      )}
    </div>
  );
}
