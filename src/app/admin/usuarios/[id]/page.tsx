import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { updateUsuario } from "../../actions";

type Params = Promise<{ id: string }>;

export default async function AdminUsuarioDetailPage({ params }: { params: Params }) {
  await requireAdmin();
  const { id } = await params;
  const id_usuario = Number(id);
  const usuario = await prisma.usuario.findUnique({ where: { id_usuario } });
  if (!usuario) notFound();

  return (
    <div>
      <p>
        <Link href="/admin/usuarios">← Usuarios</Link>
      </p>
      <h1 style={{ marginTop: 0 }}>Editar usuario #{usuario.id_usuario}</h1>
      <p className="muted">{usuario.mail}</p>

      <div className="admin-card">
        <form action={updateUsuario.bind(null, id_usuario)}>
          <div className="form-field">
            <label>Mail</label>
            <input name="mail" type="email" defaultValue={usuario.mail} required />
          </div>
          <div className="form-field">
            <label>Tipo usuario</label>
            <select name="tipo_usuario" defaultValue={usuario.tipo_usuario}>
              <option value="admin">admin</option>
              <option value="vendedor">vendedor</option>
              <option value="cliente">cliente</option>
            </select>
          </div>
          <div className="form-field">
            <label>
              <input type="checkbox" name="activo" defaultChecked={usuario.activo} /> Activo
            </label>
          </div>
          <button className="btn btn-primary" type="submit">
            Guardar
          </button>
        </form>
      </div>
    </div>
  );
}
