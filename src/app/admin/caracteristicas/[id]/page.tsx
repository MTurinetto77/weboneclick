import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { deleteCaracteristica, updateCaracteristica } from "../../actions";

type Params = Promise<{ id: string }>;

export default async function AdminCaracteristicaDetailPage({ params }: { params: Params }) {
  await requireAdmin();
  const { id } = await params;
  const id_caracteristica = Number(id);

  const item = await prisma.caracteristica.findUnique({
    where: { id_caracteristica },
    include: {
      _count: {
        select: {
          productos: true,
          categorias: true,
        },
      },
    },
  });

  if (!item) notFound();

  const canDelete = item._count.productos === 0;

  return (
    <div>
      <p>
        <Link href="/admin/caracteristicas">← Características</Link>
      </p>
      <h1 style={{ marginTop: 0 }}>Editar característica #{item.id_caracteristica}</h1>
      <p className="muted">
        Usada en {item._count.productos} producto{item._count.productos === 1 ? "" : "s"} y{" "}
        {item._count.categorias} categorí{item._count.categorias === 1 ? "a" : "as"}.
      </p>

      <div className="admin-card">
        <form action={updateCaracteristica.bind(null, id_caracteristica)}>
          <div className="form-field">
            <label>Nombre</label>
            <input name="nombre" defaultValue={item.nombre} required />
          </div>
          <button className="btn btn-primary" type="submit">
            Guardar
          </button>
        </form>
      </div>

      {canDelete ? (
        <form action={deleteCaracteristica.bind(null, id_caracteristica)}>
          <button className="btn btn-ghost" type="submit">
            Eliminar característica
          </button>
        </form>
      ) : (
        <p className="muted">
          No se puede eliminar porque hay productos asociados a esta característica.
        </p>
      )}
    </div>
  );
}
