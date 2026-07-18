import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { createBanner, deleteBanner } from "@/app/admin/cms-actions";

export default async function AdminBannersPage() {
  await requireAdmin();
  const banners = await prisma.banner.findMany({ orderBy: [{ ubicacion: "asc" }, { orden: "asc" }] });

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Banners</h1>
      <p className="muted">Imágenes dinámicas con vigencia desde / hasta.</p>

      <form action={createBanner} className="admin-card" style={{ display: "grid", gap: "0.6rem", marginBottom: "1.5rem" }}>
        <h3 style={{ margin: 0 }}>Nuevo banner</h3>
        <input name="titulo" placeholder="Título" required />
        <input name="imagen_desktop" placeholder="URL imagen desktop" required />
        <input name="imagen_mobile" placeholder="URL imagen mobile (opcional)" />
        <input name="link" placeholder="Link (ej. /shop)" />
        <input name="ubicacion" placeholder="Ubicación (hero, bloque-home…)" defaultValue="hero" required />
        <input name="orden" type="number" defaultValue={0} />
        <label>
          Vigencia desde
          <input name="vigencia_desde" type="datetime-local" required />
        </label>
        <label>
          Vigencia hasta
          <input name="vigencia_hasta" type="datetime-local" />
        </label>
        <button type="submit" className="btn btn-primary">
          Crear
        </button>
      </form>

      <div style={{ display: "grid", gap: "0.75rem" }}>
        {banners.map((b) => (
          <div key={b.id_banner} className="admin-card" style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
            <div>
              <strong>{b.titulo}</strong>
              <div className="muted" style={{ fontSize: "0.85rem" }}>
                {b.ubicacion} · orden {b.orden} · {b.activo ? "activo" : "inactivo"}
                <br />
                {b.vigencia_desde.toISOString()} → {b.vigencia_hasta?.toISOString() ?? "sin fin"}
              </div>
            </div>
            <form action={deleteBanner.bind(null, b.id_banner)}>
              <button type="submit" className="btn btn-ghost">
                Eliminar
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
