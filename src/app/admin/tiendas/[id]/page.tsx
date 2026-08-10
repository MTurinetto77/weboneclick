import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { deleteTienda, updateTienda } from "@/app/admin/cms-actions";
import { ConfirmDeleteButton } from "../confirm-delete-button";

type Params = Promise<{ id: string }>;

export default async function AdminTiendaDetailPage({ params }: { params: Params }) {
  await requireAdmin();
  const { id } = await params;
  const id_tienda = Number(id);
  if (!Number.isInteger(id_tienda) || id_tienda <= 0) notFound();

  const tienda = await prisma.tienda.findUnique({ where: { id_tienda } });
  if (!tienda) notFound();

  return (
    <div>
      <p>
        <Link href="/admin/tiendas">← Tiendas</Link>
      </p>
      <h1 style={{ marginTop: 0 }}>Editar tienda #{tienda.id_tienda}</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        El horario se muestra en checkout y en el mail de confirmación de retiro.
      </p>

      <div className="admin-card">
        <form action={updateTienda.bind(null, id_tienda)}>
          <div className="form-field">
            <label>Nombre</label>
            <input name="nombre" defaultValue={tienda.nombre} required />
          </div>
          <div className="form-field">
            <label>Slug</label>
            <input name="slug" defaultValue={tienda.slug} required />
          </div>
          <div className="form-field">
            <label>Dirección</label>
            <input name="direccion" defaultValue={tienda.direccion} required />
          </div>
          <div className="form-field">
            <label>Dirección corta</label>
            <input name="direccion_corta" defaultValue={tienda.direccion_corta ?? ""} />
          </div>
          <div className="form-field">
            <label>Localidad</label>
            <input name="localidad" defaultValue={tienda.localidad} required />
          </div>
          <div className="form-field">
            <label>Provincia</label>
            <input name="provincia" defaultValue={tienda.provincia} required />
          </div>
          <div className="form-field">
            <label>Código postal</label>
            <input name="codigo_postal" defaultValue={tienda.codigo_postal ?? ""} />
          </div>
          <div className="form-field">
            <label>Email</label>
            <input name="email" type="email" defaultValue={tienda.email ?? ""} />
          </div>
          <div className="form-field">
            <label>Teléfono</label>
            <input name="telefono" defaultValue={tienda.telefono ?? ""} />
          </div>
          <div className="form-field">
            <label>Orden</label>
            <input name="orden" type="number" defaultValue={tienda.orden} />
          </div>
          <div className="form-field">
            <label>Horarios</label>
            <textarea
              name="horarios"
              rows={3}
              defaultValue={tienda.horarios ?? ""}
              placeholder="Ej: Lunes a Sábados de 10:00 a 19:00 hs"
            />
          </div>
          <input type="hidden" name="activo" value="0" />
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "1rem",
            }}
          >
            <input type="checkbox" name="activo" value="1" defaultChecked={tienda.activo} />
            Activa
          </label>
          <div className="actions">
            <button className="btn btn-primary" type="submit">
              Guardar
            </button>
            <Link href="/admin/tiendas" className="btn btn-ghost">
              Cancelar
            </Link>
          </div>
        </form>
      </div>

      <ConfirmDeleteButton
        action={deleteTienda.bind(null, id_tienda)}
        message={`¿Eliminar la tienda "${tienda.nombre}"? Esta acción no se puede deshacer.`}
      />
    </div>
  );
}
