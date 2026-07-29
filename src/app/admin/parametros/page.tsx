import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import {
  FASTRACK_ZONAS_PRECIO,
  PARAM_VALOR_ENVIO_GRATIS,
  SMARTPOST_CORDONES,
  paramFastrackPrecioZona,
} from "@/lib/parametros";
import {
  updateParametroAction,
  upsertParametroAction,
} from "@/app/admin/parametros/actions";

export const dynamic = "force-dynamic";

export default async function AdminParametrosPage() {
  await requireAdmin();
  const params = await prisma.parametro.findMany({
    orderBy: [{ grupo_parametros: "asc" }, { nombre: "asc" }],
  });

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Parámetros</h1>
      <p className="muted">
        Configuración genérica (nombre / tipo / valor / grupo). Ejemplos:{" "}
        <code>{SMARTPOST_CORDONES[0].param}</code>…cordones SmartPost,{" "}
        <code>{PARAM_VALOR_ENVIO_GRATIS}</code>,{" "}
        <code>{paramFastrackPrecioZona(FASTRACK_ZONAS_PRECIO[0])}</code>…zona 7 (grupo{" "}
        <code>envios</code>).
      </p>

      <form
        action={upsertParametroAction}
        className="admin-card"
        style={{
          display: "grid",
          gap: "0.55rem",
          gridTemplateColumns: "minmax(9rem, 1.1fr) 6.5rem 7rem minmax(10rem, 1.4fr) auto",
          alignItems: "end",
          marginBottom: "1.5rem",
        }}
      >
        <label>
          Nombre
          <input name="nombre" placeholder={SMARTPOST_CORDONES[0].param} required />
        </label>
        <label>
          Tipo
          <select name="tipo" defaultValue="number">
            <option value="string">string</option>
            <option value="number">number</option>
            <option value="boolean">boolean</option>
            <option value="json">json</option>
          </select>
        </label>
        <label>
          Grupo
          <input name="grupo_parametros" placeholder="envios" />
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
            <th style={{ width: "24%" }}>Nombre</th>
            <th style={{ width: "6.5rem" }}>Tipo</th>
            <th style={{ width: "7rem" }}>Grupo</th>
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
                  <select form={formId} name="tipo" defaultValue={p.tipo}>
                    <option value="string">string</option>
                    <option value="number">number</option>
                    <option value="boolean">boolean</option>
                    <option value="json">json</option>
                  </select>
                </td>
                <td>
                  <input
                    form={formId}
                    name="grupo_parametros"
                    defaultValue={p.grupo_parametros ?? ""}
                    style={{ width: "100%", minWidth: 0, boxSizing: "border-box" }}
                  />
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
                  <form id={formId} action={updateParametroAction.bind(null, p.id_parametro)}>
                    <button type="submit" className="btn btn-ghost">
                      Actualizar
                    </button>
                  </form>
                </td>
              </tr>
            );
          })}
          {!params.length && (
            <tr>
              <td colSpan={6} className="muted">
                Sin parámetros.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
