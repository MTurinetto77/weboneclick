import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { formatPrice, uploadPublicUrl } from "@/lib/utils";
import {
  addPrecio,
  deleteCaracteristicaProducto,
  deleteProductoImagen,
  updateProducto,
  uploadProductoImagen,
  upsertCaracteristicaProducto,
  upsertStock,
} from "../../actions";

type Params = Promise<{ id: string }>;

export default async function AdminProductoDetailPage({ params }: { params: Params }) {
  await requireAdmin();
  const { id } = await params;
  const id_producto = Number(id);
  const product = await prisma.producto.findUnique({
    where: { id_producto },
    include: {
      precios: { orderBy: { fecha_desde: "desc" } },
      stocks: { include: { almacen: true } },
      categorias: true,
      caracteristicas: { include: { caracteristica: true } },
      archivos: { include: { archivo: true } },
    },
  });
  if (!product) notFound();

  const [categorias, almacenes, caracteristicas] = await Promise.all([
    prisma.categoria.findMany({ orderBy: [{ nivel: "asc" }, { nombre: "asc" }] }),
    prisma.almacen.findMany({ orderBy: { descripcion: "asc" } }),
    prisma.caracteristica.findMany({ orderBy: { nombre: "asc" } }),
  ]);

  const selectedCats = new Set(product.categorias.map((c) => c.id_categoria));

  return (
    <div>
      <p>
        <Link href="/admin/productos">← Productos</Link>
      </p>
      <h1 style={{ marginTop: 0 }}>Editar producto #{product.id_producto}</h1>

      <div className="admin-card">
        <form action={updateProducto.bind(null, id_producto)}>
          <div className="form-field">
            <label>Título</label>
            <input name="titulo" defaultValue={product.titulo} required />
          </div>
          <div className="form-field">
            <label>Descripción</label>
            <textarea name="descripcion" rows={4} defaultValue={product.descripcion} required />
          </div>
          <div className="form-field">
            <label>
              <input type="checkbox" name="activo" defaultChecked={product.activo} /> Activo
            </label>
          </div>
          <div className="form-field">
            <label>Categorías</label>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: "4rem" }}>Asociar</th>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Nivel</th>
                </tr>
              </thead>
              <tbody>
                {categorias.map((c) => (
                  <tr key={c.id_categoria}>
                    <td>
                      <input
                        type="checkbox"
                        name="categorias"
                        value={c.id_categoria}
                        defaultChecked={selectedCats.has(c.id_categoria)}
                        aria-label={`Asociar ${c.nombre}`}
                      />
                    </td>
                    <td>{c.id_categoria}</td>
                    <td style={{ paddingLeft: `${(c.nivel - 1) * 0.75 + 0.8}rem` }}>{c.nombre}</td>
                    <td>{c.nivel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="btn btn-primary" type="submit">
            Guardar
          </button>
        </form>
      </div>

      <div className="admin-card">
        <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Precios</h2>
        <ul>
          {product.precios.map((p) => (
            <li key={p.fecha_desde.toISOString()}>
              {p.fecha_desde.toISOString().slice(0, 10)} — {formatPrice(p.precio)}
            </li>
          ))}
        </ul>
        <form action={addPrecio.bind(null, id_producto)} className="search-form">
          <input name="fecha_desde" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
          <input name="precio" type="number" step="0.01" min="0" placeholder="Precio" required />
          <button className="btn btn-secondary" type="submit">
            Agregar precio
          </button>
        </form>
      </div>

      <div className="admin-card">
        <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Stock</h2>
        <ul>
          {product.stocks.map((s) => (
            <li key={s.id_almacen}>
              {s.almacen.descripcion}: {Number(s.cantidad)}
            </li>
          ))}
        </ul>
        <form action={upsertStock.bind(null, id_producto)} className="search-form">
          <select name="id_almacen" required defaultValue="">
            <option value="" disabled>
              Almacén
            </option>
            {almacenes.map((a) => (
              <option key={a.id_almacen} value={a.id_almacen}>
                {a.descripcion}
              </option>
            ))}
          </select>
          <input name="cantidad" type="number" step="0.01" min="0" placeholder="Cantidad" required />
          <button className="btn btn-secondary" type="submit">
            Guardar stock
          </button>
        </form>
      </div>

      <div className="admin-card">
        <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Características</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Característica</th>
              <th>Valor</th>
              <th>Tipo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {product.caracteristicas.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">
                  Sin características asignadas.
                </td>
              </tr>
            ) : (
              product.caracteristicas.map((c) => (
                <tr key={c.id_caracteristica}>
                  <td>{c.caracteristica.nombre}</td>
                  <td>{c.valor}</td>
                  <td>{c.valor_numerico ? "Numérico" : "Cualitativo"}</td>
                  <td>
                    <form
                      action={deleteCaracteristicaProducto.bind(
                        null,
                        id_producto,
                        c.id_caracteristica
                      )}
                    >
                      <button className="btn btn-ghost" type="submit">
                        Quitar
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <form action={upsertCaracteristicaProducto.bind(null, id_producto)} style={{ marginTop: "1rem" }}>
          <div className="form-field">
            <label>Característica</label>
            <select name="id_caracteristica" required defaultValue="">
              <option value="" disabled>
                Seleccionar
              </option>
              {caracteristicas.map((c) => (
                <option key={c.id_caracteristica} value={c.id_caracteristica}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Valor</label>
            <input name="valor" required />
          </div>
          <div className="form-field">
            <label>
              <input type="checkbox" name="valor_numerico" /> Valor numérico
            </label>
          </div>
          <button className="btn btn-secondary" type="submit">
            Guardar característica
          </button>
        </form>
      </div>

      <div className="admin-card">
        <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Imágenes</h2>
        <div className="grid-products">
          {product.archivos.map((ap) => (
            <div key={ap.id_archivo}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={uploadPublicUrl(ap.archivo.link)}
                alt={ap.archivo.descripcion}
                style={{ borderRadius: 6, border: "1px solid var(--color-border)", aspectRatio: "4/3", objectFit: "cover" }}
              />
              <form action={deleteProductoImagen.bind(null, id_producto, ap.id_archivo)} style={{ marginTop: 8 }}>
                <button className="btn btn-ghost" type="submit">
                  Eliminar
                </button>
              </form>
            </div>
          ))}
        </div>
        <form action={uploadProductoImagen.bind(null, id_producto)} style={{ marginTop: "1rem" }}>
          <div className="form-field">
            <label>Nueva imagen</label>
            <input name="imagen" type="file" accept="image/*" required />
          </div>
          <div className="form-field">
            <label>Descripción</label>
            <input name="descripcion" placeholder="Principal" />
          </div>
          <button className="btn btn-secondary" type="submit">
            Subir imagen
          </button>
        </form>
      </div>
    </div>
  );
}
