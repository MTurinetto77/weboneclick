import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import {
  createExclusion,
  deleteExclusion,
  updateExclusion,
} from "@/app/admin/exclusiones/actions";

function toInputDate(d: Date | null | undefined) {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

export default async function AdminExclusionesPage() {
  await requireAdmin();
  const items = await prisma.exclusion_fiscal.findMany({
    orderBy: [{ orden: "asc" }, { vigencia_desde: "desc" }],
  });

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Exclusiones de retenciones</h1>
      <p className="muted">
        Tabla de vigencias mostrada en <code>/fiscal</code> bajo exclusiones de retenciones /
        percepciones.
      </p>

      <form
        action={createExclusion}
        className="admin-card"
        style={{ display: "grid", gap: "0.55rem", marginBottom: "1.5rem" }}
      >
        <h3 style={{ margin: 0 }}>Nueva exclusión</h3>
        <input name="impuesto" placeholder="Descripción / impuesto" required />
        <label>
          Desde
          <input name="vigencia_desde" type="date" required />
        </label>
        <label>
          Hasta (vacío = vigente sin fin)
          <input name="vigencia_hasta" type="date" />
        </label>
        <input name="orden" type="number" defaultValue={items.length + 1} placeholder="Orden" />
        <button type="submit" className="btn btn-primary">
          Crear
        </button>
      </form>

      <div style={{ display: "grid", gap: "1rem" }}>
        {items.map((item) => (
          <article key={item.id_exclusion} className="admin-card">
            <form
              action={updateExclusion.bind(null, item.id_exclusion)}
              style={{ display: "grid", gap: "0.55rem" }}
            >
              <strong>#{item.id_exclusion}</strong>
              <input name="impuesto" defaultValue={item.impuesto} required />
              <label>
                Desde
                <input
                  name="vigencia_desde"
                  type="date"
                  defaultValue={toInputDate(item.vigencia_desde)}
                  required
                />
              </label>
              <label>
                Hasta
                <input
                  name="vigencia_hasta"
                  type="date"
                  defaultValue={toInputDate(item.vigencia_hasta)}
                />
              </label>
              <input name="orden" type="number" defaultValue={item.orden} />
              <input type="hidden" name="activo" value="0" />
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" name="activo" value="1" defaultChecked={item.activo} />
                Activa
              </label>
              <button type="submit" className="btn btn-primary">
                Guardar
              </button>
            </form>
            <form
              action={deleteExclusion.bind(null, item.id_exclusion)}
              style={{ marginTop: "0.75rem" }}
            >
              <button type="submit" className="btn btn-ghost">
                Eliminar
              </button>
            </form>
          </article>
        ))}
        {!items.length && <p className="muted">Todavía no hay exclusiones cargadas.</p>}
      </div>
    </div>
  );
}
