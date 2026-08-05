import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { DESTACADOS_PESTANAS } from "@/lib/secciones-constants";
import {
  addSeccionProducto,
  moveSeccionProducto,
  removeSeccionProducto,
  updateSeccion,
} from "../actions";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type LinkedProduct = {
  id_producto: number;
  orden: number;
  producto: {
    id_producto: number;
    titulo: string;
    slug: string;
    sku: string | null;
  };
};

type SearchProduct = {
  id_producto: number;
  titulo: string;
  slug: string;
  sku: string | null;
};

async function searchProducts(q: string): Promise<SearchProduct[]> {
  if (!q) return [];
  return prisma.producto.findMany({
    where: { activo: true, sku: { contains: q } },
    select: { id_producto: true, titulo: true, slug: true, sku: true },
    take: 20,
    orderBy: { titulo: "asc" },
  });
}

const btnSm = { padding: "0.15rem 0.4rem", fontSize: "0.75rem" } as const;

function ProductBlock({
  id_seccion,
  pestana,
  title,
  products,
  qParam,
  q,
  searchResults,
  linkedIds,
}: {
  id_seccion: number;
  pestana: string;
  title: string;
  products: LinkedProduct[];
  qParam: string;
  q: string;
  searchResults: SearchProduct[];
  linkedIds: Set<number>;
}) {
  return (
    <div className="admin-card">
      <h2>
        {title}{" "}
        <span className="muted" style={{ fontWeight: 400, fontSize: "0.8rem" }}>
          ({products.length})
        </span>
      </h2>

      <table className="admin-table table table-compact">
        <thead>
          <tr>
            <th style={{ width: "3rem" }}>#</th>
            <th style={{ width: "6rem" }}>SKU</th>
            <th>Título</th>
            <th style={{ width: "7.5rem" }}></th>
          </tr>
        </thead>
        <tbody>
          {products.map((row, i) => (
            <tr key={`${pestana}-${row.id_producto}`}>
              <td>{i + 1}</td>
              <td>
                <code style={{ fontSize: "0.78rem" }}>{row.producto.sku ?? "—"}</code>
              </td>
              <td>
                <Link href={`/admin/productos/${row.id_producto}`}>{row.producto.titulo}</Link>
              </td>
              <td>
                <div style={{ display: "flex", gap: "0.2rem", justifyContent: "flex-end" }}>
                  <form
                    action={moveSeccionProducto.bind(
                      null,
                      id_seccion,
                      row.id_producto,
                      pestana,
                      "up"
                    )}
                  >
                    <button
                      type="submit"
                      className="btn btn-ghost"
                      disabled={i === 0}
                      title="Subir"
                      style={btnSm}
                    >
                      ↑
                    </button>
                  </form>
                  <form
                    action={moveSeccionProducto.bind(
                      null,
                      id_seccion,
                      row.id_producto,
                      pestana,
                      "down"
                    )}
                  >
                    <button
                      type="submit"
                      className="btn btn-ghost"
                      disabled={i === products.length - 1}
                      title="Bajar"
                      style={btnSm}
                    >
                      ↓
                    </button>
                  </form>
                  <form
                    action={removeSeccionProducto.bind(
                      null,
                      id_seccion,
                      row.id_producto,
                      pestana
                    )}
                  >
                    <button type="submit" className="btn btn-ghost" style={btnSm}>
                      Quitar
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
          {!products.length && (
            <tr>
              <td colSpan={4} className="muted">
                Sin productos.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <form
        method="get"
        className="admin-inline-form"
        style={{ marginTop: "0.65rem" }}
      >
        <input
          name={qParam}
          defaultValue={q}
          placeholder="Buscar por SKU…"
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
              <th style={{ width: "5rem" }}></th>
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
                    <form action={addSeccionProducto.bind(null, id_seccion)}>
                      <input type="hidden" name="id_producto" value={p.id_producto} />
                      <input type="hidden" name="pestana" value={pestana} />
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
  );
}

export default async function AdminSeccionDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const id_seccion = Number(id);
  if (!Number.isFinite(id_seccion)) notFound();

  const seccion = await prisma.seccion.findUnique({
    where: { id_seccion },
    include: {
      productos: {
        include: {
          producto: {
            select: { id_producto: true, titulo: true, slug: true, sku: true },
          },
        },
        orderBy: [{ pestana: "asc" }, { orden: "asc" }],
      },
    },
  });
  if (!seccion) notFound();

  const isDestacados = seccion.clave === "destacados";

  const blocks = isDestacados
    ? await Promise.all(
        DESTACADOS_PESTANAS.map(async (tab) => {
          const qRaw = sp[`q_${tab.id}`];
          const q = typeof qRaw === "string" ? qRaw.trim() : "";
          const products = seccion.productos.filter((p) => p.pestana === tab.id);
          return {
            pestana: tab.id,
            title: tab.label,
            qParam: `q_${tab.id}`,
            q,
            products,
            linkedIds: new Set(products.map((p) => p.id_producto)),
            searchResults: await searchProducts(q),
          };
        })
      )
    : await (async () => {
        const q = typeof sp.q === "string" ? sp.q.trim() : "";
        const products = seccion.productos.filter((p) => p.pestana === "");
        return [
          {
            pestana: "",
            title: "Productos",
            qParam: "q",
            q,
            products,
            linkedIds: new Set(products.map((p) => p.id_producto)),
            searchResults: await searchProducts(q),
          },
        ];
      })();

  return (
    <div>
      <p style={{ margin: "0 0 0.35rem", fontSize: "0.85rem" }}>
        <Link href="/admin/secciones-productos">← Secciones productos</Link>
      </p>
      <h1 style={{ margin: "0 0 0.75rem", fontSize: "1.35rem" }}>
        {seccion.nombre}
        <span className="muted" style={{ fontSize: "0.95rem", fontWeight: 400 }}>
          {" "}
          · <code>{seccion.clave}</code>
        </span>
      </h1>

      <div className="admin-card" style={{ marginBottom: "0.75rem", padding: "0.75rem" }}>
        <form action={updateSeccion.bind(null, id_seccion)} className="admin-edit-inline">
          <div className="form-field">
            <label>Nombre (título en la home)</label>
            <input name="nombre" defaultValue={seccion.nombre} required />
          </div>
          <div className="form-field form-field-check">
            <label>
              <input type="checkbox" name="activo" defaultChecked={seccion.activo} /> Activo
            </label>
          </div>
          <button className="btn btn-primary" type="submit" style={{ alignSelf: "flex-end" }}>
            Guardar
          </button>
        </form>
      </div>

      <div
        className={isDestacados ? "admin-secciones-grid" : "admin-secciones-grid admin-secciones-grid-flat"}
      >
        {blocks.map((b) => (
          <ProductBlock
            key={b.pestana || "flat"}
            id_seccion={id_seccion}
            pestana={b.pestana}
            title={b.title}
            products={b.products}
            qParam={b.qParam}
            q={b.q}
            searchResults={b.searchResults}
            linkedIds={b.linkedIds}
          />
        ))}
      </div>
    </div>
  );
}
