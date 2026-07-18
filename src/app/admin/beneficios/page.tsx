import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { createBeneficio, deleteBeneficio } from "@/app/admin/cms-actions";

export default async function AdminBeneficiosPage() {
  await requireAdmin();
  const beneficios = await prisma.beneficio.findMany({ orderBy: { nombre: "asc" } });
  const tarjetas = await prisma.tarjeta_adherida.findMany({ orderBy: { nombre: "asc" } });

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Beneficios</h1>
      <form
        action={createBeneficio}
        className="admin-card"
        style={{ display: "grid", gap: "0.55rem", marginBottom: "1.25rem" }}
      >
        <h3 style={{ margin: 0 }}>Nuevo beneficio</h3>
        <input name="nombre" placeholder="Nombre" required />
        <input name="slug" placeholder="Slug (opcional)" />
        <input name="cuotas" type="number" placeholder="Cuotas" />
        <textarea name="descripcion" placeholder="Descripción" rows={3} />
        <button type="submit" className="btn btn-primary">
          Crear
        </button>
      </form>

      <div style={{ display: "grid", gap: "0.6rem", marginBottom: "2rem" }}>
        {beneficios.map((b) => (
          <div
            key={b.id_beneficio}
            className="admin-card"
            style={{ display: "flex", justifyContent: "space-between" }}
          >
            <div>
              <strong>{b.nombre}</strong>
              {b.cuotas != null && <span className="muted"> · {b.cuotas} cuotas</span>}
            </div>
            <form action={deleteBeneficio.bind(null, b.id_beneficio)}>
              <button type="submit" className="btn btn-ghost">
                Eliminar
              </button>
            </form>
          </div>
        ))}
      </div>

      <h2>Tarjetas adheridas</h2>
      <ul>
        {tarjetas.map((t) => (
          <li key={t.id_tarjeta}>
            {t.nombre}
            {t.banco ? ` (${t.banco})` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
