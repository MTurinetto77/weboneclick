import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { pickCurrentPrice } from "@/lib/products";
import { formatPrice } from "@/lib/utils";
import { DescuentoGeneralImportModal } from "@/components/admin/descuento-general-import-modal";
import { ProductoSyncModal } from "@/components/admin/producto-sync-modal";

type SearchParams = Promise<{
  q?: string;
  page?: string;
  dg_err?: string;
  dg_ok?: string;
  dg_applied?: string;
  dg_cleared?: string;
  dg_missing?: string;
  dg_miss_list?: string;
}>;

const PAGE_SIZE = 15;

export default async function AdminProductosPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const q = params.q?.trim() || undefined;
  const page = Math.max(1, Number(params.page || 1) || 1);
  const dgErr = params.dg_err;
  const dgOk = params.dg_ok;
  const dgApplied = params.dg_applied;
  const dgCleared = params.dg_cleared;
  const dgMissing = params.dg_missing;
  const dgMissList = params.dg_miss_list;
  const showDgResult = Boolean(dgErr || dgOk);

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

  const exportQs = new URLSearchParams();
  if (q) exportQs.set("q", q);
  const exportHref = `/admin/productos/export${exportQs.toString() ? `?${exportQs}` : ""}`;

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
        <ProductoSyncModal />
        <DescuentoGeneralImportModal />
        <a href={exportHref} className="btn btn-secondary" style={{ padding: "0.35rem 0.75rem" }}>
          Exportar CSV
        </a>
        <Link href="/admin/productos/nuevo" className="btn btn-primary" style={{ padding: "0.35rem 0.75rem" }}>
          Crear
        </Link>
      </div>

      {showDgResult ? (
        <div
          className="admin-card"
          style={{
            marginBottom: "0.85rem",
            padding: "0.75rem 1rem",
            background: dgErr ? "#fff5f5" : "#f3faf5",
          }}
        >
          {dgErr === "archivo" && (
            <p style={{ margin: 0 }}>Seleccioná un archivo CSV para importar.</p>
          )}
          {dgErr === "vacio" && (
            <p style={{ margin: 0 }}>
              El CSV no tiene filas válidas (<code>sku</code> + <code>poc_descuento</code>).
            </p>
          )}
          {!dgErr && (
            <p style={{ margin: 0 }}>
              Importación descuento general: <strong>{dgOk || "0"}</strong> actualizados
              {dgApplied != null ? (
                <>
                  {" "}
                  (<strong>{dgApplied}</strong> con descuento
                  {dgCleared && Number(dgCleared) > 0 ? (
                    <>
                      , <strong>{dgCleared}</strong> quitados
                    </>
                  ) : null}
                  )
                </>
              ) : null}
              {dgMissing && Number(dgMissing) > 0 ? (
                <>
                  ; <strong>{dgMissing}</strong> SKU no encontrados
                  {dgMissList ? (
                    <>
                      {" "}
                      ({dgMissList}
                      {Number(dgMissing) > 15 ? "…" : ""})
                    </>
                  ) : null}
                </>
              ) : null}
              .
            </p>
          )}
        </div>
      ) : null}

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
