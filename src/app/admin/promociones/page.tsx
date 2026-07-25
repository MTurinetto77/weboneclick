import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export default async function AdminPromocionesPage() {
  await requireAdmin();
  const promociones = await prisma.promocion.findMany({
    include: {
      _count: { select: { categorias: true, productos: true } },
    },
    orderBy: [{ prioridad: "asc" }, { id_promocion: "asc" }],
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
          <h1 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Promociones</h1>
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            Submenú del header. Prioridad menor = primero.
          </p>
        </div>
        <Link href="/admin/promociones/nuevo" className="btn btn-primary" style={{ padding: "0.35rem 0.75rem" }}>
          Crear
        </Link>
      </div>

      <table className="table table-compact">
        <thead>
          <tr>
            <th>ID</th>
            <th>Prioridad</th>
            <th>Nombre</th>
            <th>Subtítulo</th>
            <th>Slug</th>
            <th>Activo</th>
            <th>Cats</th>
            <th>Prods</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {promociones.map((p) => (
            <tr key={p.id_promocion}>
              <td>{p.id_promocion}</td>
              <td>{p.prioridad}</td>
              <td>
                {p.icono && !p.icono.includes("/") ? `${p.icono} ` : null}
                {p.nombre}
              </td>
              <td>{p.subtitulo ?? "—"}</td>
              <td>
                <Link href={`/${p.slug}`}>/{p.slug}</Link>
              </td>
              <td>{p.activo ? "Sí" : "No"}</td>
              <td>{p._count.categorias}</td>
              <td>{p._count.productos}</td>
              <td>
                <Link href={`/admin/promociones/${p.id_promocion}`}>Editar</Link>
              </td>
            </tr>
          ))}
          {!promociones.length && (
            <tr>
              <td colSpan={9} className="muted">
                No hay promociones cargadas.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
