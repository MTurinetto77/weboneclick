import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export default async function AdminMarcasPage() {
  await requireAdmin();
  const marcas = await prisma.marca.findMany({
    orderBy: { nombre: "asc" },
    include: { _count: { select: { productos: true } } },
  });

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Marcas</h1>
      <p className="muted">Sincronizadas desde Odoo (product.brand). Editables vía sync.</p>
      <table className="table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Slug</th>
            <th>Odoo ID</th>
            <th>Productos</th>
          </tr>
        </thead>
        <tbody>
          {marcas.map((m) => (
            <tr key={m.id_marca}>
              <td>{m.nombre}</td>
              <td>{m.slug}</td>
              <td>{m.odoo_id ?? "—"}</td>
              <td>{m._count.productos}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
