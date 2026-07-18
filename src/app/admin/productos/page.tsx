import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { pickCurrentPrice } from "@/lib/products";
import { formatPrice } from "@/lib/utils";

type SearchParams = Promise<{ q?: string; page?: string }>;

const PAGE_SIZE = 15;

export default async function AdminProductosPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const q = params.q?.trim() || undefined;
  const page = Math.max(1, Number(params.page || 1) || 1);

  const where = q
    ? {
        OR: [{ titulo: { contains: q } }, { descripcion: { contains: q } }],
      }
    : undefined;

  const [productos, total] = await Promise.all([
    prisma.producto.findMany({
      where,
      include: { precios: true },
      orderBy: { id_producto: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.producto.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function hrefFor(nextPage: number) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (nextPage > 1) sp.set("page", String(nextPage));
    const qs = sp.toString();
    return qs ? `/admin/productos?${qs}` : "/admin/productos";
  }

  return (
    <div>
      <div className="actions" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Productos</h1>
        <Link href="/admin/productos/nuevo" className="btn btn-primary">
          Nuevo producto
        </Link>
      </div>

      <form className="search-form" action="/admin/productos" method="get" style={{ marginTop: "1rem" }}>
        <input name="q" defaultValue={q || ""} placeholder="Buscar..." />
        <button className="btn btn-secondary" type="submit">
          Buscar
        </button>
        <Link href="/admin/productos" className="btn btn-ghost">
          Limpiar
        </Link>
      </form>

      <p className="muted" style={{ marginTop: 0 }}>
        {total} producto{total === 1 ? "" : "s"}
        {totalPages > 1 ? ` · página ${page} de ${totalPages}` : ""}
      </p>

      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Título</th>
            <th>Precio</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {productos.length === 0 ? (
            <tr>
              <td colSpan={5} className="muted">
                No se encontraron productos.
              </td>
            </tr>
          ) : (
            productos.map((p) => (
              <tr key={p.id_producto}>
                <td>{p.id_producto}</td>
                <td>{p.titulo}</td>
                <td>{formatPrice(pickCurrentPrice(p.precios))}</td>
                <td>{p.activo ? "Activo" : "Inactivo"}</td>
                <td>
                  <Link href={`/admin/productos/${p.id_producto}`}>Editar</Link>
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
