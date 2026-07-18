import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guard";
import { createUsuario } from "../../actions";

export default async function AdminNuevoUsuarioPage() {
  await requireAdmin();

  return (
    <div>
      <p>
        <Link href="/admin/usuarios">← Usuarios</Link>
      </p>
      <h1 style={{ marginTop: 0 }}>Nuevo usuario</h1>

      <div className="admin-card">
        <form action={createUsuario}>
          <div className="form-field">
            <label>Mail</label>
            <input name="mail" type="email" required />
          </div>
          <div className="form-field">
            <label>Tipo usuario</label>
            <select name="tipo_usuario" defaultValue="admin">
              <option value="admin">admin</option>
              <option value="cliente">cliente</option>
            </select>
          </div>
          <div className="form-field">
            <label>
              <input type="checkbox" name="activo" defaultChecked /> Activo
            </label>
          </div>
          <div className="actions">
            <button className="btn btn-primary" type="submit">
              Crear
            </button>
            <Link href="/admin/usuarios" className="btn btn-ghost">
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
