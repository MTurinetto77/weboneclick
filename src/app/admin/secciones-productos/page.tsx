import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export default async function AdminSeccionesProductosPage() {
  await requireAdmin();
  const secciones = await prisma.seccion.findMany({
    include: {
      _count: { select: { productos: true } },
    },
    orderBy: [{ orden: "asc" }, { id_seccion: "asc" }],
  });

  return (
    <div>
      <div style={{ marginBottom: "0.85rem" }}>
        <h1 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Secciones productos</h1>
        <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
          Títulos y productos de las 3 secciones de la home. Destacados tiene sublistas
          Apple / JBL / Accesorios.
        </p>
      </div>

      <table className="table table-compact">
        <thead>
          <tr>
            <th>ID</th>
            <th>Clave</th>
            <th>Nombre</th>
            <th>Activo</th>
            <th>Productos</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {secciones.map((s) => (
            <tr key={s.id_seccion}>
              <td>{s.id_seccion}</td>
              <td>
                <code>{s.clave}</code>
              </td>
              <td>{s.nombre}</td>
              <td>{s.activo ? "Sí" : "No"}</td>
              <td>{s._count.productos}</td>
              <td>
                <Link href={`/admin/secciones-productos/${s.id_seccion}`}>Editar</Link>
              </td>
            </tr>
          ))}
          {!secciones.length && (
            <tr>
              <td colSpan={6} className="muted">
                No hay secciones. Corré{" "}
                <code>npx tsx scripts/seed-home-secciones.ts</code>.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
