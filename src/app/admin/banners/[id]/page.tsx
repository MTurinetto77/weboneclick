import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guard";
import { BANNER_UBICACIONES, bannerImageUrl, bannerSizeHint } from "@/lib/banners";
import { prisma } from "@/lib/prisma";
import { deleteBanner, updateBanner } from "../actions";

type Params = Promise<{ id: string }>;

function toDatetimeLocal(d: Date | null) {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Solo prellenar el campo URL cuando el valor es una URL manual (no un archivo subido). */
function urlFieldValue(value: string | null) {
  if (!value) return "";
  return value.startsWith("http") || value.startsWith("/") ? value : "";
}

export default async function AdminBannerDetailPage({ params }: { params: Params }) {
  await requireAdmin();
  const { id } = await params;
  const id_banner = Number(id);
  if (!Number.isFinite(id_banner)) notFound();

  const banner = await prisma.banner.findUnique({ where: { id_banner } });
  if (!banner) notFound();

  const sizeHint = bannerSizeHint(banner.ubicacion);

  return (
    <div>
      <p>
        <Link href="/admin/banners">← Banners</Link>
      </p>
      <h1 style={{ marginTop: 0 }}>Editar banner #{banner.id_banner}</h1>

      <div className="admin-card">
        <form action={updateBanner.bind(null, id_banner)}>
          <div className="form-field">
            <label>Título</label>
            <input name="titulo" defaultValue={banner.titulo} required />
          </div>

          <div className="form-field">
            <label>Ubicación</label>
            <select name="ubicacion" required defaultValue={banner.ubicacion}>
              {BANNER_UBICACIONES.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label} — {u.sizeHint}
                </option>
              ))}
            </select>
            {sizeHint ? (
              <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.8rem" }}>
                Tamaño preferido de imagen: {sizeHint}
              </p>
            ) : null}
          </div>

          <div className="form-field">
            <label>Imagen desktop / fondo</label>
            <div style={{ marginBottom: "0.5rem" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bannerImageUrl(banner.imagen_desktop)}
                alt={banner.titulo}
                style={{ maxWidth: "100%", maxHeight: 160, objectFit: "contain", borderRadius: 6, display: "block" }}
              />
            </div>
            <input name="imagen_desktop_file" type="file" accept="image/*" />
          </div>
          <div className="form-field">
            <label>… o URL de imagen desktop</label>
            <input
              name="imagen_desktop_url"
              defaultValue={urlFieldValue(banner.imagen_desktop)}
              placeholder="/oneclick/banners/hero.jpg o https://…"
            />
          </div>

          <div className="form-field">
            <label>Imagen mobile (opcional)</label>
            {banner.imagen_mobile ? (
              <div style={{ marginBottom: "0.5rem" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bannerImageUrl(banner.imagen_mobile)}
                  alt=""
                  style={{ maxWidth: "100%", maxHeight: 160, objectFit: "contain", borderRadius: 6, display: "block" }}
                />
                <label style={{ display: "block", marginTop: "0.35rem" }}>
                  <input type="checkbox" name="quitar_imagen_mobile" /> Quitar imagen mobile
                </label>
              </div>
            ) : null}
            <input name="imagen_mobile_file" type="file" accept="image/*" />
          </div>
          <div className="form-field">
            <label>… o URL de imagen mobile</label>
            <input
              name="imagen_mobile_url"
              defaultValue={urlFieldValue(banner.imagen_mobile)}
              placeholder="/oneclick/banners/hero-mobile.jpg"
            />
          </div>

          <div className="form-field">
            <label>HTML del contenido (texto, botón, etc.)</label>
            <textarea
              name="html"
              rows={12}
              defaultValue={banner.html ?? ""}
              style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "0.85rem" }}
            />
          </div>
          <div className="form-field">
            <label>Clase CSS extra del contenedor (opcional)</label>
            <input
              name="clase_css"
              defaultValue={banner.clase_css ?? ""}
              placeholder="oc-promo-dark o oc-promo-light (triple)"
            />
            <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.8rem" }}>
              Para el triple: <code>oc-promo-dark</code> (tarjeta oscura) o <code>oc-promo-light</code>.
            </p>
          </div>

          <div className="form-field">
            <label>Orden (menor = primero; en triple usar 1, 2, 3)</label>
            <input name="orden" type="number" defaultValue={banner.orden} />
          </div>
          <div className="form-field">
            <label>Vigencia desde</label>
            <input
              name="vigencia_desde"
              type="datetime-local"
              defaultValue={toDatetimeLocal(banner.vigencia_desde)}
              required
            />
          </div>
          <div className="form-field">
            <label>Vigencia hasta (opcional, vacío = sin fin)</label>
            <input
              name="vigencia_hasta"
              type="datetime-local"
              defaultValue={toDatetimeLocal(banner.vigencia_hasta)}
            />
          </div>
          <div className="form-field">
            <label>
              <input type="checkbox" name="activo" defaultChecked={banner.activo} /> Activo
            </label>
          </div>

          <button className="btn btn-primary" type="submit">
            Guardar
          </button>
        </form>
      </div>

      <form action={deleteBanner.bind(null, id_banner)}>
        <button type="submit" className="btn btn-ghost" style={{ color: "#c00" }}>
          Eliminar banner
        </button>
      </form>
    </div>
  );
}
