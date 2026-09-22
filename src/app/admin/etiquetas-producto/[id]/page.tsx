import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { uploadPublicUrl } from "@/lib/utils";
import {
  addEtiquetaWebProducto,
  addEtiquetaWebProductos,
  deleteEtiquetaWeb,
  importEtiquetaWebProductosCsv,
  removeEtiquetaWebProducto,
  updateEtiquetaWeb,
} from "../actions";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function spStr(v: string | string[] | undefined) {
  return typeof v === "string" ? v : "";
}

export default async function AdminEtiquetaProductoDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const id_etiqueta_web = Number(id);
  if (!Number.isFinite(id_etiqueta_web)) notFound();

  const q = spStr(sp.q).trim();
  const csvErr = spStr(sp.csv_err);
  const csvAdded = spStr(sp.csv_added);
  const csvDup = spStr(sp.csv_dup);
  const csvMissing = spStr(sp.csv_missing);
  const csvMissList = spStr(sp.csv_miss_list);
  const showCsvResult = csvErr || csvAdded || csvDup || csvMissing;

  const etiqueta = await prisma.etiqueta_web.findUnique({
    where: { id_etiqueta_web },
    include: {
      productos: {
        include: {
          producto: { select: { id_producto: true, titulo: true, sku: true } },
        },
        orderBy: { producto: { titulo: "asc" } },
      },
    },
  });
  if (!etiqueta) notFound();

  const searchResults = q
    ? await prisma.producto.findMany({
        where: {
          activo: true,
          OR: [{ titulo: { contains: q } }, { sku: { contains: q } }],
        },
        select: { id_producto: true, titulo: true, sku: true },
        take: 500,
        orderBy: { titulo: "asc" },
      })
    : [];

  const linkedIds = new Set(etiqueta.productos.map((p) => p.id_producto));
  const pendientes = searchResults.filter((p) => !linkedIds.has(p.id_producto));

  return (
    <div>
      <p>
        <Link href="/admin/etiquetas-producto">← Etiquetas de producto</Link>
      </p>
      <h1 style={{ marginTop: 0 }}>Editar etiqueta #{etiqueta.id_etiqueta_web}</h1>

      {showCsvResult ? (
        <div
          className="admin-card"
          style={{
            marginBottom: "0.75rem",
            padding: "0.65rem 0.85rem",
            fontSize: "0.85rem",
            background: csvErr ? "#fff5f5" : "#f3faf5",
          }}
        >
          {csvErr === "archivo" && <p style={{ margin: 0 }}>Seleccioná un archivo CSV para importar.</p>}
          {csvErr === "vacio" && <p style={{ margin: 0 }}>El CSV no tiene SKUs válidos.</p>}
          {!csvErr && (
            <p style={{ margin: 0 }}>
              Importación: <strong>{csvAdded || "0"}</strong> agregados
              {csvDup && Number(csvDup) > 0 ? (
                <>
                  , <strong>{csvDup}</strong> ya tenían la etiqueta
                </>
              ) : null}
              {csvMissing && Number(csvMissing) > 0 ? (
                <>
                  , <strong>{csvMissing}</strong> no encontrados
                  {csvMissList ? (
                    <span className="muted">
                      {" "}
                      ({csvMissList}
                      {Number(csvMissing) > 15 ? "…" : ""})
                    </span>
                  ) : null}
                </>
              ) : null}
              .
            </p>
          )}
        </div>
      ) : null}

      <div className="admin-card">
        <form action={updateEtiquetaWeb.bind(null, id_etiqueta_web)}>
          <div className="form-field">
            <label>Nombre (uso interno)</label>
            <input name="nombre" defaultValue={etiqueta.nombre} required />
          </div>
          <div className="form-field">
            <label>Imagen (badge en la card)</label>
            {etiqueta.imagen ? (
              <div style={{ marginBottom: "0.5rem" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={uploadPublicUrl(etiqueta.imagen)}
                  alt=""
                  style={{ height: 56, objectFit: "contain" }}
                />
                <label style={{ display: "block", marginTop: "0.35rem" }}>
                  <input type="checkbox" name="quitar_imagen" /> Quitar imagen
                </label>
              </div>
            ) : null}
            <input name="imagen" type="file" accept="image/*" />
          </div>
          <div className="form-field">
            <label>Prioridad (menor = gana si el producto tiene varias)</label>
            <input name="prioridad" type="number" defaultValue={etiqueta.prioridad} />
          </div>
          <div className="form-field">
            <label>
              <input type="checkbox" name="activo" defaultChecked={etiqueta.activo} /> Activo
            </label>
          </div>
          <button className="btn btn-primary" type="submit">
            Guardar
          </button>
        </form>
      </div>

      <div className="admin-card">
        <h2 style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", flexWrap: "wrap" }}>
          Importar CSV por SKU
          <a
            href="/ejemplos/promocion-skus.csv"
            download="etiqueta-skus.csv"
            style={{ fontSize: "0.8rem", fontWeight: 400 }}
          >
            Descargar CSV de ejemplo
          </a>
        </h2>
        <p className="muted" style={{ margin: "0 0 0.5rem", fontSize: "0.78rem" }}>
          Una columna <code>sku</code> o un SKU por línea. Se omiten duplicados y se reportan los
          que no existan.
        </p>
        <form
          action={importEtiquetaWebProductosCsv.bind(null, id_etiqueta_web)}
          className="admin-inline-form"
        >
          <input
            name="csv"
            type="file"
            accept=".csv,text/csv,text/plain"
            required
            style={{ flex: "1 1 10rem" }}
          />
          <button
            className="btn btn-secondary"
            type="submit"
            style={{ padding: "0.15rem 0.4rem", fontSize: "0.75rem" }}
          >
            Importar
          </button>
        </form>
      </div>

      <div className="admin-card">
        <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Productos con esta etiqueta</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>SKU</th>
              <th>Título</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {etiqueta.productos.map((row) => (
              <tr key={row.id_producto}>
                <td>{row.id_producto}</td>
                <td>{row.producto.sku ?? "—"}</td>
                <td>
                  <Link href={`/admin/productos/${row.id_producto}`}>{row.producto.titulo}</Link>
                </td>
                <td>
                  <form
                    action={removeEtiquetaWebProducto.bind(null, id_etiqueta_web, row.id_producto)}
                  >
                    <button type="submit" className="btn btn-ghost">
                      Quitar
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {!etiqueta.productos.length && (
              <tr>
                <td colSpan={4}>Sin productos asignados.</td>
              </tr>
            )}
          </tbody>
        </table>

        <h3 style={{ fontSize: "1rem" }}>Buscar y agregar producto</h3>
        <form method="get" className="search-form" style={{ marginBottom: "1rem" }}>
          <input name="q" defaultValue={q} placeholder="Título o SKU…" />
          <button className="btn btn-secondary" type="submit">
            Buscar
          </button>
        </form>

        {q && pendientes.length > 0 && (
          <form
            action={addEtiquetaWebProductos.bind(null, id_etiqueta_web)}
            style={{ marginBottom: "0.75rem" }}
          >
            {pendientes.map((p) => (
              <input key={p.id_producto} type="hidden" name="id_producto" value={p.id_producto} />
            ))}
            <button type="submit" className="btn btn-primary">
              Agregar todos ({pendientes.length})
            </button>
          </form>
        )}

        {q && (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>SKU</th>
                <th>Título</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {searchResults.map((p) => (
                <tr key={p.id_producto}>
                  <td>{p.id_producto}</td>
                  <td>{p.sku ?? "—"}</td>
                  <td>{p.titulo}</td>
                  <td>
                    {linkedIds.has(p.id_producto) ? (
                      <span className="muted">Ya asignado</span>
                    ) : (
                      <form action={addEtiquetaWebProducto.bind(null, id_etiqueta_web)}>
                        <input type="hidden" name="id_producto" value={p.id_producto} />
                        <button type="submit" className="btn btn-secondary">
                          Agregar
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {!searchResults.length && (
                <tr>
                  <td colSpan={4}>No hay resultados para &quot;{q}&quot;.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <form action={deleteEtiquetaWeb.bind(null, id_etiqueta_web)}>
        <button type="submit" className="btn btn-ghost" style={{ color: "#c00" }}>
          Eliminar etiqueta
        </button>
      </form>
    </div>
  );
}
