import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import {
  addRegaloProducto,
  deleteRegalo,
  removeRegaloProducto,
  updateRegalo,
} from "../actions";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function toDatetimeLocal(d: Date | null) {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function AdminRegaloDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const id_regalo = Number(id);
  if (!Number.isFinite(id_regalo)) notFound();

  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const regalo = await prisma.regalo.findUnique({
    where: { id_regalo },
    include: {
      usuario_creacion: { select: { mail: true } },
      productos: {
        include: {
          producto: {
            select: { id_producto: true, titulo: true, slug: true, sku: true },
          },
        },
      },
    },
  });
  if (!regalo) notFound();

  const searchResults = q
    ? await prisma.producto.findMany({
        where: {
          OR: [
            { titulo: { contains: q } },
            { sku: { contains: q } },
          ],
        },
        select: { id_producto: true, titulo: true, slug: true, sku: true, activo: true },
        take: 20,
        orderBy: { titulo: "asc" },
      })
    : [];

  const linkedIds = new Set(regalo.productos.map((p) => p.id_producto));

  return (
    <div>
      <p>
        <Link href="/admin/regalos">← Regalos</Link>
      </p>
      <h1 style={{ marginTop: 0 }}>Editar regalo #{regalo.id_regalo}</h1>
      <p className="muted">
        Creado por {regalo.usuario_creacion.mail} el{" "}
        {regalo.fecha_creacion.toLocaleString("es-AR")}
      </p>

      <div className="admin-card">
        <form action={updateRegalo.bind(null, id_regalo)}>
          <div className="form-field">
            <label>Nombre</label>
            <input name="nombre" defaultValue={regalo.nombre} required />
          </div>
          <div className="form-field">
            <label>Monto mínimo de compra</label>
            <input
              name="monto_minimo"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={Number(regalo.monto_minimo)}
            />
          </div>
          <div className="form-field">
            <label>Vigencia desde</label>
            <input
              name="vigencia_desde"
              type="datetime-local"
              required
              defaultValue={toDatetimeLocal(regalo.vigencia_desde)}
            />
          </div>
          <div className="form-field">
            <label>Vigencia hasta (opcional)</label>
            <input
              name="vigencia_hasta"
              type="datetime-local"
              defaultValue={toDatetimeLocal(regalo.vigencia_hasta)}
            />
          </div>
          <div className="form-field">
            <label>
              <input name="activo" type="checkbox" defaultChecked={regalo.activo} /> Activo
            </label>
          </div>
          <button className="btn btn-primary" type="submit">
            Guardar
          </button>
        </form>
      </div>

      <div className="admin-card" style={{ marginTop: "1rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>SKUs de regalo</h2>
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          El cliente elige uno de estos productos en el checkout cuando el carrito
          supera el monto mínimo.
        </p>

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
            {regalo.productos.map((row) => (
              <tr key={row.id_producto}>
                <td>{row.id_producto}</td>
                <td>{row.producto.sku ?? "—"}</td>
                <td>
                  <Link href={`/admin/productos/${row.id_producto}`}>
                    {row.producto.titulo}
                  </Link>
                </td>
                <td>
                  <form
                    action={removeRegaloProducto.bind(
                      null,
                      id_regalo,
                      row.id_producto,
                    )}
                  >
                    <button type="submit" className="btn btn-ghost">
                      Quitar
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {!regalo.productos.length && (
              <tr>
                <td colSpan={4}>Sin productos asociados.</td>
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
                  <td>
                    {p.titulo}
                    {!p.activo && <span className="muted"> (inactivo)</span>}
                  </td>
                  <td>
                    {linkedIds.has(p.id_producto) ? (
                      <span className="muted">Ya asociado</span>
                    ) : (
                      <form action={addRegaloProducto.bind(null, id_regalo)}>
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

      <form action={deleteRegalo.bind(null, id_regalo)} style={{ marginTop: "1rem" }}>
        <button type="submit" className="btn btn-ghost" style={{ color: "#c00" }}>
          Eliminar regalo
        </button>
      </form>
    </div>
  );
}
