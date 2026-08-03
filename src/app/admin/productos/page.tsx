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
        OR: [
          { titulo: { contains: q } },
          { descripcion: { contains: q } },
          { sku: { contains: q } },
        ],
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
          <h1 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Productos</h1>
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            Catálogo de productos. Precio vigente según lista de precios.
          </p>
        </div>
        <Link href="/admin/productos/nuevo" className="btn btn-primary" style={{ padding: "0.35rem 0.75rem" }}>
          Crear
        </Link>
      </div>

      <form
        method="get"
        action="/admin/productos"
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
          <input name="q" defaultValue={q || ""} placeholder="Título, SKU o descripción…" />
        </div>
        <button type="submit" className="btn btn-secondary">
          Buscar
        </button>
        <Link href="/admin/productos" className="btn btn-ghost">
          Limpiar
        </Link>
      </form>

      <table className="table table-compact">
        <thead>
          <tr>
            <th>ID</th>
            <th>SKU</th>
            <th>Título</th>
            <th>Precio</th>
            <th>Activo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {productos.length === 0 ? (
            <tr>
              <td colSpan={6} className="muted">
                No se encontraron productos.
              </td>
            </tr>
          ) : (
            productos.map((p) => (
              <tr key={p.id_producto}>
                <td>{p.id_producto}</td>
                <td>{p.sku || "—"}</td>
                <td>{p.titulo}</td>
                <td>{formatPrice(pickCurrentPrice(p.precios))}</td>
                <td>{p.activo ? "Sí" : "No"}</td>
                <td>
                  <Link href={`/admin/productos/${p.id_producto}`}>Editar</Link>
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
            Página {page} de {totalPages} ({total} producto{total === 1 ? "" : "s"})
          </span>
          {page > 1 && <Link href={hrefFor(page - 1)}>← Anterior</Link>}
          {page < totalPages && <Link href={hrefFor(page + 1)}>Siguiente →</Link>}
        </p>
      )}
    </div>
  );
}
