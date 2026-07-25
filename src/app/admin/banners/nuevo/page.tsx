import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guard";
import { BANNER_UBICACIONES } from "@/lib/banners";
import { createBanner } from "../actions";

export default async function AdminNuevoBannerPage() {
  await requireAdmin();

  return (
    <div>
      <p>
        <Link href="/admin/banners">← Banners</Link>
      </p>
      <h1 style={{ marginTop: 0 }}>Nuevo banner</h1>

      <div className="admin-card">
        <form action={createBanner}>
          <div className="form-field">
            <label>Título</label>
            <input name="titulo" required placeholder="Hot Sale — Hero principal" />
          </div>
          <div className="form-field">
            <label>Ubicación</label>
            <select name="ubicacion" required defaultValue="hero">
              {BANNER_UBICACIONES.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label} — {u.sizeHint}
                </option>
              ))}
            </select>
            <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.8rem" }}>
              Elegí la ubicación en la home. El tamaño preferido de imagen aparece en cada opción.
            </p>
          </div>
          <div className="form-field">
            <label>Imagen desktop (archivo)</label>
            <input name="imagen_desktop_file" type="file" accept="image/*" />
          </div>
          <div className="form-field">
            <label>… o URL de imagen desktop / fondo</label>
            <input name="imagen_desktop_url" placeholder="/oneclick/banners/hero.jpg o https://…" />
          </div>
          <div className="form-field">
            <label>Imagen mobile (archivo, opcional)</label>
            <input name="imagen_mobile_file" type="file" accept="image/*" />
          </div>
          <div className="form-field">
            <label>… o URL de imagen mobile</label>
            <input name="imagen_mobile_url" placeholder="/oneclick/banners/hero-mobile.jpg" />
          </div>
          <div className="form-field">
            <label>HTML del contenido (texto, botón, etc.)</label>
            <textarea
              name="html"
              rows={12}
              placeholder={'<div class="oc-hero-live-copy">\n  <span class="oc-pill-orange">PROMO</span>\n  <h1>Título</h1>\n  <a href="/shop" class="oc-hero-cta-link">Ver más →</a>\n</div>'}
              style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "0.85rem" }}
            />
          </div>
          <div className="form-field">
            <label>Clase CSS extra del contenedor (opcional)</label>
            <input name="clase_css" placeholder="oc-promo-dark o oc-promo-light (triple)" />
            <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.8rem" }}>
              Para el triple: <code>oc-promo-dark</code> (tarjeta oscura) o <code>oc-promo-light</code>.
            </p>
          </div>
          <div className="form-field">
            <label>Link al hacer clic (opcional, legado)</label>
            <input name="link" placeholder="/shop" />
          </div>
          <div className="form-field">
            <label>Orden (menor = primero; en triple usar 1, 2, 3)</label>
            <input name="orden" type="number" defaultValue={0} />
          </div>
          <div className="form-field">
            <label>Vigencia desde</label>
            <input name="vigencia_desde" type="datetime-local" required />
          </div>
          <div className="form-field">
            <label>Vigencia hasta (opcional, vacío = sin fin)</label>
            <input name="vigencia_hasta" type="datetime-local" />
          </div>
          <button className="btn btn-primary" type="submit">
            Crear
          </button>
        </form>
      </div>
    </div>
  );
}
