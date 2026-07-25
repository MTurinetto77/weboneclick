import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guard";
import { createPromocion } from "../actions";

export default async function AdminNuevaPromocionPage() {
  await requireAdmin();

  return (
    <div>
      <p>
        <Link href="/admin/promociones">← Promociones</Link>
      </p>
      <h1 style={{ marginTop: 0 }}>Nueva promoción</h1>

      <div className="admin-card">
        <form action={createPromocion} encType="multipart/form-data">
          <div className="form-field">
            <label>Nombre</label>
            <input name="nombre" required placeholder="Vacaciones de Invierno" />
          </div>
          <div className="form-field">
            <label>Subtítulo (kicker naranja del menú)</label>
            <input name="subtitulo" placeholder="Promo!" />
          </div>
          <div className="form-field">
            <label>Icono (emoji o texto)</label>
            <input name="icono" placeholder="❄️" />
          </div>
          <div className="form-field">
            <label>Icono imagen (opcional, reemplaza emoji)</label>
            <input name="icono_imagen" type="file" accept="image/*" />
          </div>
          <div className="form-field">
            <label>Etiqueta de producto (badge en card)</label>
            <input name="etiqueta_imagen" type="file" accept="image/*" />
          </div>
          <div className="form-field">
            <label>Prioridad</label>
            <input name="prioridad" type="number" defaultValue={0} />
          </div>
          <div className="form-field">
            <label>Slug (sección URL)</label>
            <input name="slug" placeholder="vacaciones-de-invierno" />
          </div>
          <button className="btn btn-primary" type="submit">
            Crear
          </button>
        </form>
      </div>
    </div>
  );
}
