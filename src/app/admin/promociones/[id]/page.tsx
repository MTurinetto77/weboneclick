import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { uploadPublicUrl } from "@/lib/utils";
import { isPromoIconImage } from "@/lib/promos";
import {
  addPromocionProducto,
  deletePromocion,
  removePromocionProducto,
  updatePromocion,
} from "../actions";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

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
          producto: { select: { id_producto: true, titulo: true, slug: true } },
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
            titulo: { contains: q },
          },
          select: { id_producto: true, titulo: true, slug: true },
          take: 20,
          orderBy: { titulo: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const selectedCats = new Set(promo.categorias.map((c) => c.id_categoria));
  const linkedIds = new Set(promo.productos.map((p) => p.id_producto));

  return (
    <div>
      <p>
        <Link href="/admin/promociones">← Promociones</Link>
      </p>
      <h1 style={{ marginTop: 0 }}>
        Editar promoción #{promo.id_promocion}
      </h1>
      <p className="muted">
        URL pública: <Link href={`/${promo.slug}`}>/{promo.slug}</Link>
      </p>

      <div className="admin-card">
        <form action={updatePromocion.bind(null, id_promocion)} encType="multipart/form-data">
          <div className="form-field">
            <label>Nombre</label>
            <input name="nombre" defaultValue={promo.nombre} required />
          </div>
          <div className="form-field">
            <label>Subtítulo (kicker naranja del menú)</label>
            <input name="subtitulo" defaultValue={promo.subtitulo ?? ""} />
          </div>
          <div className="form-field">
            <label>Icono (emoji o texto)</label>
            <input name="icono" defaultValue={isPromoIconImage(promo.icono) ? "" : (promo.icono ?? "")} />
          </div>
          <div className="form-field">
            <label>Icono imagen (opcional)</label>
            {isPromoIconImage(promo.icono) && promo.icono ? (
              <div style={{ marginBottom: "0.5rem" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={uploadPublicUrl(promo.icono)}
                  alt=""
                  style={{ height: 32, objectFit: "contain" }}
                />
                <label style={{ display: "block", marginTop: "0.35rem" }}>
                  <input type="checkbox" name="quitar_icono_img" /> Quitar imagen de icono
                </label>
              </div>
            ) : null}
            <input name="icono_imagen" type="file" accept="image/*" />
          </div>
          <div className="form-field">
            <label>Etiqueta de producto (superpuesta en la card)</label>
            {promo.etiqueta_imagen ? (
              <div style={{ marginBottom: "0.5rem" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={uploadPublicUrl(promo.etiqueta_imagen)}
                  alt=""
                  style={{ height: 56, objectFit: "contain" }}
                />
                <label style={{ display: "block", marginTop: "0.35rem" }}>
                  <input type="checkbox" name="quitar_etiqueta" /> Quitar etiqueta
                </label>
              </div>
            ) : null}
            <input name="etiqueta_imagen" type="file" accept="image/*" />
          </div>
          <div className="form-field">
            <label>Prioridad</label>
            <input name="prioridad" type="number" defaultValue={promo.prioridad} />
          </div>
          <div className="form-field">
            <label>Slug</label>
            <input name="slug" defaultValue={promo.slug} required />
          </div>
          <div className="form-field">
            <label>
              <input type="checkbox" name="activo" defaultChecked={promo.activo} /> Activo
            </label>
          </div>

          <div className="form-field">
            <label>Categorías asociadas</label>
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
        <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Productos asociados</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Título</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {promo.productos.map((row) => (
              <tr key={row.id_producto}>
                <td>{row.id_producto}</td>
                <td>
                  <Link href={`/admin/productos/${row.id_producto}`}>{row.producto.titulo}</Link>
                </td>
                <td>
                  <form action={removePromocionProducto.bind(null, id_promocion, row.id_producto)}>
                    <button type="submit" className="btn btn-ghost">
                      Quitar
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {!promo.productos.length && (
              <tr>
                <td colSpan={3}>Sin productos asociados (se pueden usar solo categorías).</td>
              </tr>
            )}
          </tbody>
        </table>

        <h3 style={{ fontSize: "1rem" }}>Buscar y agregar producto</h3>
        <form method="get" className="search-form" style={{ marginBottom: "1rem" }}>
          <input name="q" defaultValue={q} placeholder="Título del producto…" />
          <button className="btn btn-secondary" type="submit">
            Buscar
          </button>
        </form>

        {q && (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Título</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {searchResults.map((p) => (
                <tr key={p.id_producto}>
                  <td>{p.id_producto}</td>
                  <td>{p.titulo}</td>
                  <td>
                    {linkedIds.has(p.id_producto) ? (
                      <span className="muted">Ya asociado</span>
                    ) : (
                      <form action={addPromocionProducto.bind(null, id_promocion)}>
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
                  <td colSpan={3}>No hay resultados para &quot;{q}&quot;.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <form action={deletePromocion.bind(null, id_promocion)}>
        <button
          type="submit"
          className="btn btn-ghost"
          style={{ color: "#c00" }}
        >
          Eliminar promoción
        </button>
      </form>
    </div>
  );
}
