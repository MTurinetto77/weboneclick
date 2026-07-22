import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { formatPriceArs } from "@/lib/pricing";
import { PARAM_SMARTPOST_PRECIO, getParametro } from "@/lib/parametros";
import {
  clearProveedorAction,
  deleteCpEnvioAction,
  importFastrack,
  importSmartpost,
} from "@/app/admin/envios/actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function sp(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdminEnviosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const q = await searchParams;
  const proveedorFilter = sp(q.proveedor) || "";
  const cpFilter = (sp(q.cp) || "").trim();
  const page = Math.max(1, Number(sp(q.page) || 1) || 1);
  const pageSize = 50;

  const where = {
    ...(proveedorFilter === "fastrack" || proveedorFilter === "smartpost"
      ? { proveedor: proveedorFilter }
      : {}),
    ...(cpFilter ? { codigo_postal: { contains: cpFilter } } : {}),
  };

  const [total, items, counts, smartpostPrecio] = await Promise.all([
    prisma.codigo_postal_envio.count({ where }),
    prisma.codigo_postal_envio.findMany({
      where,
      orderBy: [{ proveedor: "asc" }, { codigo_postal: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.codigo_postal_envio.groupBy({
      by: ["proveedor"],
      _count: { _all: true },
    }),
    getParametro(PARAM_SMARTPOST_PRECIO),
  ]);

  const countByProv = Object.fromEntries(
    counts.map((c) => [c.proveedor, c._count._all]),
  ) as Record<string, number>;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const ok = sp(q.ok);
  const countImported = sp(q.count);
  const cleared = sp(q.cleared);
  const excluidas = sp(q.excluidas);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Envíos</h1>
      <p className="muted">
        Códigos postales habilitados por proveedor (FastTrack / SmartPost). El precio de
        SmartPost se configura en{" "}
        <Link href="/admin/parametros">Parámetros</Link>.
      </p>

      {(ok || cleared) && (
        <p
          className="admin-card"
          style={{
            marginBottom: "1rem",
            background: "#e8f5e9",
            borderColor: "#a5d6a7",
          }}
        >
          {ok === "fastrack" && (
            <>
              FastTrack importado: <strong>{countImported}</strong> CPs
              {excluidas ? <> (zonas excluidas: {excluidas})</> : null}.
            </>
          )}
          {ok === "smartpost" && (
            <>
              SmartPost importado: <strong>{countImported}</strong> CPs.
            </>
          )}
          {cleared && (
            <>
              Se eliminaron los CPs de <strong>{cleared}</strong>.
            </>
          )}
        </p>
      )}

      <div
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          marginBottom: "1.5rem",
        }}
      >
        <form
          action={importFastrack}
          encType="multipart/form-data"
          className="admin-card"
          style={{ display: "grid", gap: "0.55rem" }}
        >
          <h3 style={{ margin: 0 }}>Importar FastTrack</h3>
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            Formato <code>Fast track.xlsx</code> (hoja Zonas STD). El archivo no trae
            precio; se aplica el indicado abajo. Por defecto se excluye la zona 1.
          </p>
          <label>
            Archivo Excel
            <input name="archivo" type="file" accept=".xlsx,.xls" required />
          </label>
          <label>
            Zonas a excluir (números separados por coma)
            <input name="zonas_excluir" defaultValue="1" placeholder="1" />
          </label>
          <label>
            Precio de envío
            <input
              name="precio"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="0.00"
            />
          </label>
          <button type="submit" className="btn btn-primary">
            Importar FastTrack
          </button>
          <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
            En base: {countByProv.fastrack ?? 0} CPs
          </p>
        </form>

        <form
          action={importSmartpost}
          encType="multipart/form-data"
          className="admin-card"
          style={{ display: "grid", gap: "0.55rem" }}
        >
          <h3 style={{ margin: 0 }}>Importar SmartPost</h3>
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            Formato <code>SmartPost.xlsx</code> (hoja CP). El precio se toma del
            parámetro <code>{PARAM_SMARTPOST_PRECIO}</code> (la columna Costo del Excel se
            ignora).
          </p>
          <label>
            Archivo Excel
            <input name="archivo" type="file" accept=".xlsx,.xls" required />
          </label>
          <label>
            Días de entrega
            <input name="dias_entrega" type="number" min="1" defaultValue={1} />
          </label>
          <label>
            Precio (opcional; si vacío usa el parámetro)
            <input
              name="precio"
              type="number"
              step="0.01"
              min="0"
              defaultValue={smartpostPrecio ?? ""}
              placeholder={smartpostPrecio || "Parámetro requerido"}
            />
          </label>
          <button type="submit" className="btn btn-primary">
            Importar SmartPost
          </button>
          <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
            En base: {countByProv.smartpost ?? 0} CPs · Parámetro actual:{" "}
            {smartpostPrecio || "—"}
          </p>
        </form>
      </div>

      <section>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            alignItems: "end",
            marginBottom: "0.75rem",
          }}
        >
          <form method="get" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <label>
              Proveedor
              <select name="proveedor" defaultValue={proveedorFilter}>
                <option value="">Todos</option>
                <option value="fastrack">fastrack</option>
                <option value="smartpost">smartpost</option>
              </select>
            </label>
            <label>
              CP
              <input name="cp" defaultValue={cpFilter} placeholder="1001" />
            </label>
            <button type="submit" className="btn btn-ghost">
              Filtrar
            </button>
          </form>
          <form action={clearProveedorAction} style={{ display: "flex", gap: "0.5rem" }}>
            <select name="proveedor" defaultValue="fastrack" required>
              <option value="fastrack">fastrack</option>
              <option value="smartpost">smartpost</option>
            </select>
            <button type="submit" className="btn btn-ghost">
              Vaciar proveedor
            </button>
          </form>
        </div>

        <p className="muted" style={{ fontSize: "0.85rem" }}>
          {total} registros · página {page}/{totalPages}
        </p>

        <table className="table">
          <thead>
            <tr>
              <th>Proveedor</th>
              <th>CP</th>
              <th>Localidad</th>
              <th>Días</th>
              <th>Precio</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id_cp_envio}>
                <td>{row.proveedor}</td>
                <td>{row.codigo_postal}</td>
                <td>{row.localidad}</td>
                <td>{row.dias_entrega}</td>
                <td>{formatPriceArs(Number(row.precio))}</td>
                <td>
                  <form action={deleteCpEnvioAction.bind(null, row.id_cp_envio)}>
                    <button type="submit" className="btn btn-ghost">
                      Eliminar
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={6} className="muted">
                  No hay códigos postales cargados. Usá las importaciones de arriba.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
            {page > 1 && (
              <Link
                className="btn btn-ghost"
                href={`/admin/envios?proveedor=${proveedorFilter}&cp=${encodeURIComponent(cpFilter)}&page=${page - 1}`}
              >
                Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                className="btn btn-ghost"
                href={`/admin/envios?proveedor=${proveedorFilter}&cp=${encodeURIComponent(cpFilter)}&page=${page + 1}`}
              >
                Siguiente
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
