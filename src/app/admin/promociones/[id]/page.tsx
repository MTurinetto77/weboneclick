import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { uploadPublicUrl } from "@/lib/utils";
import { isPromoIconImage } from "@/lib/promos";
import {
  addPromocionProducto,
  deletePromocion,
  importPromocionProductosCsv,
  removePromocionProducto,
  updatePromocion,
} from "../actions";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const btnSm = { padding: "0.15rem 0.4rem", fontSize: "0.75rem" } as const;

function spStr(v: string | string[] | undefined) {
  return typeof v === "string" ? v : "";
}

export default async function AdminPromocionDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const id_promocion = Number(id);
  if (!Number.isFinite(id_promocion)) notFound();

  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const promo = await prisma.promocion.findUnique({
    where: { id_promocion },
    include: {
      categorias: true,
      productos: {
        include: {
          producto: {
            select: { id_producto: true, titulo: true, slug: true, sku: true },
          },
        },
      },
    },
  });
  if (!promo) notFound();

  const [categorias, searchResults] = await Promise.all([
    prisma.categoria.findMany({ orderBy: [{ nivel: "asc" }, { nombre: "asc" }] }),
    q
      ? prisma.producto.findMany({
          where: {
            activo: true,
            OR: [{ titulo: { contains: q } }, { sku: { contains: q } }],
          },
          select: { id_producto: true, titulo: true, slug: true, sku: true },
          take: 20,
          orderBy: { titulo: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const selectedCats = new Set(promo.categorias.map((c) => c.id_categoria));
  const linkedIds = new Set(promo.productos.map((p) => p.id_producto));

  const csvErr = spStr(sp.csv_err);
  const csvAdded = spStr(sp.csv_added);
  const csvDup = spStr(sp.csv_dup);
  const csvMissing = spStr(sp.csv_missing);
  const csvMissList = spStr(sp.csv_miss_list);
  const showCsvResult = csvErr || csvAdded || csvDup || csvMissing;

  return (
    <div>
      <p style={{ margin: "0 0 0.35rem", fontSize: "0.85rem" }}>
        <Link href="/admin/promociones">← Promociones</Link>
      </p>
      <h1 style={{ margin: "0 0 0.75rem", fontSize: "1.35rem" }}>
        {promo.nombre}
        <span className="muted" style={{ fontSize: "0.95rem", fontWeight: 400 }}>
          {" "}
          · #{promo.id_promocion}
        </span>
        <span style={{ fontSize: "0.95rem", fontWeight: 400 }}>
          {" "}
          · <Link href={`/${promo.slug}`}>/{promo.slug}</Link>
        </span>
      </h1>

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
                  , <strong>{csvDup}</strong> ya estaban asociados
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

      <div className="admin-edit-grid">
        <div className="admin-card">
          <h2>Datos</h2>
          <form action={updatePromocion.bind(null, id_promocion)}>
            <div className="admin-edit-inline">
              <div className="form-field">
                <label>Nombre</label>
                <input name="nombre" defaultValue={promo.nombre} required />
              </div>
              <div className="form-field form-field-check">
                <label>
                  <input type="checkbox" name="activo" defaultChecked={promo.activo} /> Activo
                </label>
              </div>
            </div>

            <div className="admin-edit-inline">
              <div className="form-field">
                <label>Subtítulo (kicker naranja)</label>
                <input name="subtitulo" defaultValue={promo.subtitulo ?? ""} />
              </div>
              <div className="form-field" style={{ flex: "0 1 6rem" }}>
                <label>Prioridad</label>
                <input name="prioridad" type="number" defaultValue={promo.prioridad} />
              </div>
              <div className="form-field">
                <label>Slug</label>
                <input name="slug" defaultValue={promo.slug} required />
              </div>
              <div className="form-field" style={{ flex: "0 1 7rem" }}>
                <label>Icono (emoji)</label>
                <input
                  name="icono"
                  defaultValue={isPromoIconImage(promo.icono) ? "" : (promo.icono ?? "")}
                />
              </div>
            </div>

            <div className="admin-edit-inline">
              <div className="form-field" style={{ flex: "1 1 14rem" }}>
                <label>Icono imagen</label>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "nowrap" }}>
                  {isPromoIconImage(promo.icono) && promo.icono ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={uploadPublicUrl(promo.icono)}
                        alt=""
                        style={{ height: 28, width: "auto", objectFit: "contain", flexShrink: 0 }}
                      />
                      <label style={{ margin: 0, fontSize: "0.78rem", whiteSpace: "nowrap", flexShrink: 0 }}>
                        <input type="checkbox" name="quitar_icono_img" /> Quitar
                      </label>
                    </>
                  ) : null}
                  <input name="icono_imagen" type="file" accept="image/*" style={{ flex: 1, minWidth: 0 }} />
                </div>
              </div>
              <div className="form-field" style={{ flex: "1 1 14rem" }}>
                <label>Etiqueta de producto</label>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "nowrap" }}>
                  {promo.etiqueta_imagen ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={uploadPublicUrl(promo.etiqueta_imagen)}
                        alt=""
                        style={{ height: 28, width: "auto", objectFit: "contain", flexShrink: 0 }}
                      />
                      <label style={{ margin: 0, fontSize: "0.78rem", whiteSpace: "nowrap", flexShrink: 0 }}>
                        <input type="checkbox" name="quitar_etiqueta" /> Quitar
                      </label>
                    </>
                  ) : null}
                  <input name="etiqueta_imagen" type="file" accept="image/*" style={{ flex: 1, minWidth: 0 }} />
                </div>
              </div>
            </div>

            <div className="form-field" style={{ marginBottom: "0.35rem" }}>
              <label>Categorías asociadas</label>
              <div className="admin-cats-scroll">
                {categorias.map((c) => (
                  <label key={c.id_categoria} className={c.nivel > 1 ? "cat-indent" : undefined}>
                    <input
                      type="checkbox"
                      name="categorias"
                      value={c.id_categoria}
                      defaultChecked={selectedCats.has(c.id_categoria)}
                    />
                    <span style={{ paddingLeft: `${Math.max(0, c.nivel - 1) * 0.55}rem` }}>
                      {c.nombre}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="admin-save-row" style={{ marginTop: "0.65rem" }}>
              <button className="btn btn-primary" type="submit">
                Guardar
              </button>
            </div>
          </form>
        </div>

        <div className="admin-side-stack">
          <div className="admin-card">
            <h2 style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", flexWrap: "wrap" }}>
              Importar CSV por SKU
              <a
                href="/ejemplos/promocion-skus.csv"
                download="promocion-skus.csv"
                style={{ fontSize: "0.8rem", fontWeight: 400 }}
              >
                Descargar CSV de ejemplo
              </a>
            </h2>
            <p className="muted" style={{ margin: "0 0 0.5rem", fontSize: "0.78rem" }}>
              Una columna <code>sku</code> o un SKU por línea. Se omiten duplicados y se
              reportan los que no existan.
            </p>
            <form
              action={importPromocionProductosCsv.bind(null, id_promocion)}
              className="admin-inline-form"
            >
              <input
                name="csv"
                type="file"
                accept=".csv,text/csv,text/plain"
                required
                style={{ flex: "1 1 10rem" }}
              />
              <button className="btn btn-secondary" type="submit" style={btnSm}>
                Importar
              </button>
            </form>
          </div>

          <div className="admin-card">
            <h2>
              Productos{" "}
              <span className="muted" style={{ fontWeight: 400, fontSize: "0.8rem" }}>
                ({promo.productos.length})
              </span>
            </h2>

            <table className="admin-table table table-compact">
              <thead>
                <tr>
                  <th style={{ width: "6rem" }}>SKU</th>
                  <th>Título</th>
                  <th style={{ width: "4.5rem" }}></th>
                </tr>
              </thead>
              <tbody>
                {promo.productos.map((row) => (
                  <tr key={row.id_producto}>
                    <td>
                      <code style={{ fontSize: "0.78rem" }}>{row.producto.sku ?? "—"}</code>
                    </td>
                    <td>
                      <Link href={`/admin/productos/${row.id_producto}`}>{row.producto.titulo}</Link>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <form action={removePromocionProducto.bind(null, id_promocion, row.id_producto)}>
                        <button type="submit" className="btn btn-ghost" style={btnSm}>
                          Quitar
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
                {!promo.productos.length && (
                  <tr>
                    <td colSpan={3} className="muted">
                      Sin productos (pueden usarse solo categorías).
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <form method="get" className="admin-inline-form" style={{ marginTop: "0.65rem" }}>
              <input
                name="q"
                defaultValue={q}
                placeholder="Buscar título o SKU…"
                style={{ flex: "1 1 8rem" }}
              />
              <button className="btn btn-secondary" type="submit" style={btnSm}>
                Buscar
              </button>
            </form>

            {q ? (
              <table
                className="admin-table table table-compact"
                style={{ marginTop: "0.5rem" }}
              >
                <thead>
                  <tr>
                    <th style={{ width: "6rem" }}>SKU</th>
                    <th>Título</th>
                    <th style={{ width: "4rem" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map((p) => (
                    <tr key={p.id_producto}>
                      <td>
                        <code style={{ fontSize: "0.78rem" }}>{p.sku ?? "—"}</code>
                      </td>
                      <td>{p.titulo}</td>
                      <td style={{ textAlign: "right" }}>
                        {linkedIds.has(p.id_producto) ? (
                          <span className="muted" style={{ fontSize: "0.75rem" }}>
                            Ya
                          </span>
                        ) : (
                          <form action={addPromocionProducto.bind(null, id_promocion)}>
                            <input type="hidden" name="id_producto" value={p.id_producto} />
                            <button type="submit" className="btn btn-secondary" style={btnSm}>
                              +
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!searchResults.length && (
                    <tr>
                      <td colSpan={3} className="muted">
                        Sin resultados para &quot;{q}&quot;.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : null}
          </div>
        </div>
      </div>

      <form action={deletePromocion.bind(null, id_promocion)} style={{ marginTop: "1rem" }}>
        <button type="submit" className="btn btn-ghost" style={{ color: "#c00", ...btnSm }}>
          Eliminar promoción
        </button>
      </form>
    </div>
  );
}
