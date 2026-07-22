import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { PARAM_SMARTPOST_PRECIO } from "@/lib/parametros";
import {
  deleteParametroAction,
  updateParametroAction,
  upsertParametroAction,
} from "@/app/admin/parametros/actions";

export const dynamic = "force-dynamic";

export default async function AdminParametrosPage() {
  await requireAdmin();
  const params = await prisma.parametro.findMany({ orderBy: { nombre: "asc" } });

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Parámetros</h1>
      <p className="muted">
        Configuración genérica (nombre / tipo / valor). SmartPost usa{" "}
        <code>{PARAM_SMARTPOST_PRECIO}</code> (tipo <code>number</code>) al importar
        envíos.
      </p>

      <form
        action={upsertParametroAction}
        className="admin-card"
        style={{
          display: "grid",
          gap: "0.55rem",
          gridTemplateColumns: "minmax(10rem, 1.2fr) 7.5rem minmax(12rem, 2fr) auto",
          alignItems: "end",
          marginBottom: "1.5rem",
        }}
      >
        <label>
          Nombre
          <input name="nombre" placeholder={PARAM_SMARTPOST_PRECIO} required />
        </label>
        <label>
          Tipo
          <select name="tipo" defaultValue="number" style={{ width: "7.5rem" }}>
            <option value="string">string</option>
            <option value="number">number</option>
            <option value="boolean">boolean</option>
            <option value="json">json</option>
          </select>
        </label>
        <label>
          Valor
          <input name="valor" placeholder="4380.44" required />
        </label>
        <button type="submit" className="btn btn-primary">
          Guardar
        </button>
      </form>

      <table className="table" style={{ tableLayout: "fixed", width: "100%" }}>
        <thead>
          <tr>
            <th style={{ width: "3.5rem" }}>ID</th>
            <th style={{ width: "26%" }}>Nombre</th>
            <th style={{ width: "7.5rem" }}>Tipo</th>
            <th>Valor</th>
            <th style={{ width: "11rem" }}></th>
          </tr>
        </thead>
        <tbody>
          {params.map((p) => {
            const formId = `param-${p.id_parametro}`;
            return (
              <tr key={p.id_parametro}>
                <td>{p.id_parametro}</td>
                <td>
                  <code>{p.nombre}</code>
                </td>
                <td>
                  <select
                    form={formId}
                    name="tipo"
                    defaultValue={p.tipo}
                    style={{ width: "100%", maxWidth: "7.5rem" }}
                  >
                    <option value="string">string</option>
                    <option value="number">number</option>
                    <option value="boolean">boolean</option>
                    <option value="json">json</option>
                  </select>
                </td>
                <td>
                  <input
                    form={formId}
                    name="valor"
                    defaultValue={p.valor}
                    style={{ width: "100%", minWidth: 0, boxSizing: "border-box" }}
                  />
                </td>
                <td>
                  <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                    <form id={formId} action={updateParametroAction.bind(null, p.id_parametro)}>
                      <button type="submit" className="btn btn-ghost">
                        Actualizar
                      </button>
                    </form>
                    <form action={deleteParametroAction.bind(null, p.id_parametro)}>
                      <button type="submit" className="btn btn-ghost">
                        Eliminar
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            );
          })}
          {!params.length && (
            <tr>
              <td colSpan={5} className="muted">
                Sin parámetros. Creá al menos <code>{PARAM_SMARTPOST_PRECIO}</code> antes
                de importar SmartPost en Envíos.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
