import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guard";
import { bannerImageUrl } from "@/lib/banners";
import { prisma } from "@/lib/prisma";

function fmtFecha(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminBannersPage() {
  await requireAdmin();
  const banners = await prisma.banner.findMany({
    orderBy: [{ ubicacion: "asc" }, { orden: "asc" }, { id_banner: "asc" }],
  });

  const now = new Date();
  const isVigente = (b: (typeof banners)[number]) =>
    b.activo && b.vigencia_desde <= now && (!b.vigencia_hasta || b.vigencia_hasta >= now);

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          alignItems: "center",
          marginBottom: "0.85rem",
        }}
      >
        <div style={{ flex: "1 1 auto" }}>
          <h1 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Banners</h1>
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            Imágenes dinámicas con vigencia desde / hasta. Orden menor = primero.
          </p>
        </div>
        <Link href="/admin/banners/prototipo" className="btn btn-ghost" style={{ padding: "0.35rem 0.75rem" }}>
          Editor visual (prototipo)
        </Link>
        <Link href="/admin/banners/nuevo" className="btn btn-primary" style={{ padding: "0.35rem 0.75rem" }}>
          Crear
        </Link>
      </div>

      <table className="table table-compact">
        <thead>
          <tr>
            <th>ID</th>
            <th>Imagen</th>
            <th>Título</th>
            <th>Ubicación</th>
            <th>Orden</th>
            <th>Link</th>
            <th>Desde</th>
            <th>Hasta</th>
            <th>Activo</th>
            <th>Vigente</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {banners.map((b) => (
            <tr key={b.id_banner}>
              <td>{b.id_banner}</td>
              <td>
                {bannerImageUrl(b.imagen_desktop) ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={bannerImageUrl(b.imagen_desktop)}
                      alt={b.titulo}
                      style={{ width: 90, height: 34, objectFit: "cover", borderRadius: 4, display: "block" }}
                    />
                  </>
                ) : (
                  <span
                    className="muted"
                    style={{
                      display: "block",
                      width: 90,
                      height: 34,
                      lineHeight: "34px",
                      textAlign: "center",
                      fontSize: "0.7rem",
                      background: "#f2f2f4",
                      borderRadius: 4,
                    }}
                  >
                    sin imagen
                  </span>
                )}
              </td>
              <td>{b.titulo}</td>
              <td>{b.ubicacion}</td>
              <td>{b.orden}</td>
              <td>{b.link ? <Link href={b.link}>{b.link}</Link> : "—"}</td>
              <td>{fmtFecha(b.vigencia_desde)}</td>
              <td>{fmtFecha(b.vigencia_hasta)}</td>
              <td>{b.activo ? "Sí" : "No"}</td>
              <td>{isVigente(b) ? "Sí" : <span className="muted">No</span>}</td>
              <td>
                <Link href={`/admin/banners/${b.id_banner}`}>Editar</Link>
              </td>
            </tr>
          ))}
          {!banners.length && (
            <tr>
              <td colSpan={11} className="muted">
                No hay banners cargados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
