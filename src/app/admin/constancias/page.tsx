import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { uploadPublicUrl } from "@/lib/utils";
import {
  createConstancia,
  deleteConstancia,
  updateConstancia,
} from "@/app/admin/constancias/actions";

const CATEGORIAS = [
  { value: "impositiva", label: "Impositiva / retenciones" },
  { value: "bancaria", label: "Bancaria" },
  { value: "exclusion", label: "Exclusiones" },
];

export default async function AdminConstanciasPage() {
  await requireAdmin();
  const items = await prisma.constancia_fiscal.findMany({
    orderBy: [{ categoria: "asc" }, { orden: "asc" }, { titulo: "asc" }],
  });

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Constancias fiscales</h1>
      <p className="muted">
        PDFs y links que se muestran en <code>/fiscal</code> (retenciones, legajo, datos bancarios).
      </p>

      <form
        action={createConstancia}
        className="admin-card"
        style={{ display: "grid", gap: "0.55rem", marginBottom: "1.5rem" }}
        encType="multipart/form-data"
      >
        <h3 style={{ margin: 0 }}>Nueva constancia</h3>
        <input name="titulo" placeholder="Título (ej. Legajo Impositivo 2026)" required />
        <select name="categoria" defaultValue="impositiva" required>
          {CATEGORIAS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <input name="url_externa" placeholder="URL externa (opcional si subís archivo)" />
        <label>
          Archivo PDF
          <input name="archivo" type="file" accept=".pdf,application/pdf" />
        </label>
        <input name="orden" type="number" defaultValue={0} placeholder="Orden" />
        <button type="submit" className="btn btn-primary">
          Crear
        </button>
      </form>

      <div style={{ display: "grid", gap: "1rem" }}>
        {items.map((item) => {
          const href = item.archivo
            ? uploadPublicUrl(item.archivo)
            : item.url_externa || "#";
          return (
            <article key={item.id_constancia} className="admin-card">
              <form
                action={updateConstancia.bind(null, item.id_constancia)}
                style={{ display: "grid", gap: "0.55rem" }}
                encType="multipart/form-data"
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                  <strong>
                    #{item.id_constancia} · {item.categoria}
                  </strong>
                  <a href={href} target="_blank" rel="noreferrer">
                    Ver archivo
                  </a>
                </div>
                <input name="titulo" defaultValue={item.titulo} required />
                <select name="categoria" defaultValue={item.categoria}>
                  {CATEGORIAS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <input
                  name="url_externa"
                  defaultValue={item.url_externa || ""}
                  placeholder="URL externa"
                />
                <label>
                  Reemplazar PDF
                  <input name="archivo" type="file" accept=".pdf,application/pdf" />
                </label>
                <input name="orden" type="number" defaultValue={item.orden} />
                <input type="hidden" name="activo" value="0" />
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input type="checkbox" name="activo" value="1" defaultChecked={item.activo} />
                  Activa
                </label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button type="submit" className="btn btn-primary">
                    Guardar
                  </button>
                </div>
              </form>
              <form
                action={deleteConstancia.bind(null, item.id_constancia)}
                style={{ marginTop: "0.75rem" }}
              >
                <button type="submit" className="btn btn-ghost">
                  Eliminar
                </button>
              </form>
            </article>
          );
        })}
        {!items.length && <p className="muted">Todavía no hay constancias cargadas.</p>}
      </div>
    </div>
  );
}
