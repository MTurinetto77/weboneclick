import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guard";
import { createEtiquetaWeb } from "../actions";

export default async function AdminNuevaEtiquetaProductoPage() {
  await requireAdmin();

  return (
    <div>
      <p>
        <Link href="/admin/etiquetas-producto">← Etiquetas de producto</Link>
      </p>
      <h1 style={{ marginTop: 0 }}>Nueva etiqueta</h1>

      <div className="admin-card">
        <form action={createEtiquetaWeb}>
          <div className="form-field">
            <label>Nombre (uso interno)</label>
            <input name="nombre" required placeholder="Nuevo ingreso" />
          </div>
          <div className="form-field">
            <label>Imagen (badge en la card)</label>
            <input name="imagen" type="file" accept="image/*" required />
          </div>
          <div className="form-field">
            <label>Prioridad</label>
            <input name="prioridad" type="number" defaultValue={0} />
          </div>
          <button className="btn btn-primary" type="submit">
            Crear
          </button>
        </form>
      </div>
    </div>
  );
}
