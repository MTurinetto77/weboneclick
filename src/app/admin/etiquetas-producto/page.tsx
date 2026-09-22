import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { uploadPublicUrl } from "@/lib/utils";

export default async function AdminEtiquetasProductoPage() {
  await requireAdmin();
  const etiquetas = await prisma.etiqueta_web.findMany({
    include: { _count: { select: { productos: true } } },
    orderBy: [{ prioridad: "asc" }, { id_etiqueta_web: "asc" }],
  });

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
          <h1 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Etiquetas de producto</h1>
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            Badge en la card sin crear promoción. Si un producto tiene varias, se muestra la de
            prioridad menor; tienen precedencia sobre la etiqueta de promociones.
          </p>
        </div>
        <Link
          href="/admin/etiquetas-producto/nuevo"
          className="btn btn-primary"
          style={{ padding: "0.35rem 0.75rem" }}
        >
          Crear
        </Link>
      </div>

      <table className="table table-compact">
        <thead>
          <tr>
            <th>ID</th>
            <th>Prioridad</th>
            <th>Imagen</th>
            <th>Nombre</th>
            <th>Activo</th>
            <th>Prods</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {etiquetas.map((e) => (
            <tr key={e.id_etiqueta_web}>
              <td>{e.id_etiqueta_web}</td>
              <td>{e.prioridad}</td>
              <td>
                {e.imagen ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={uploadPublicUrl(e.imagen)}
                    alt=""
                    style={{ height: 32, objectFit: "contain" }}
                  />
                ) : (
                  <span className="muted">Sin imagen</span>
                )}
              </td>
              <td>{e.nombre}</td>
              <td>{e.activo ? "Sí" : "No"}</td>
              <td>{e._count.productos}</td>
              <td>
                <Link href={`/admin/etiquetas-producto/${e.id_etiqueta_web}`}>Editar</Link>
              </td>
            </tr>
          ))}
          {!etiquetas.length && (
            <tr>
              <td colSpan={7} className="muted">
                No hay etiquetas cargadas.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
