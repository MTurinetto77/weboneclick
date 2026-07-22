import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { formatPriceArs } from "@/lib/pricing";
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

  const [total, items, counts] = await Promise.all([
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
      <h1 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Envíos</h1>
      <p className="muted" style={{ marginTop: 0, marginBottom: "0.85rem", fontSize: "0.85rem" }}>
        Códigos postales por proveedor. FastTrack: precio 0. SmartPost: precio desde Excel
        (Costo).
      </p>

      {(ok || cleared) && (
        <p
          className="admin-card"
          style={{
            marginBottom: "0.75rem",
            padding: "0.55rem 0.75rem",
            background: "#e8f5e9",
            borderColor: "#a5d6a7",
            fontSize: "0.85rem",
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

      <div style={{ display: "grid", gap: "0.5rem", marginBottom: "1rem" }}>
        <form
          action={importFastrack}
          encType="multipart/form-data"
          className="admin-card"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            alignItems: "center",
            padding: "0.55rem 0.75rem",
          }}
        >
          <strong style={{ minWidth: "6.5rem", fontSize: "0.9rem" }}>FastTrack</strong>
          <input
            name="archivo"
            type="file"
            accept=".xlsx,.xls"
            required
            style={{ width: "auto", flex: "1 1 12rem", padding: "0.35rem 0.5rem" }}
          />
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.8rem",
              margin: 0,
            }}
          >
            Excluir zonas
            <input
              name="zonas_excluir"
              defaultValue="1"
              placeholder="1"
              style={{ width: "5rem", padding: "0.35rem 0.5rem" }}
            />
          </label>
          <button type="submit" className="btn btn-primary" style={{ padding: "0.35rem 0.75rem" }}>
            Importar
          </button>
          <span className="muted" style={{ fontSize: "0.75rem" }}>
            {countByProv.fastrack ?? 0} CPs · precio 0
          </span>
        </form>

        <form
          action={importSmartpost}
          encType="multipart/form-data"
          className="admin-card"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            alignItems: "center",
            padding: "0.55rem 0.75rem",
          }}
        >
          <strong style={{ minWidth: "6.5rem", fontSize: "0.9rem" }}>SmartPost</strong>
          <input
            name="archivo"
            type="file"
            accept=".xlsx,.xls"
            required
            style={{ width: "auto", flex: "1 1 12rem", padding: "0.35rem 0.5rem" }}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: "0.35rem 0.75rem" }}>
            Importar
          </button>
          <span className="muted" style={{ fontSize: "0.75rem" }}>
            {countByProv.smartpost ?? 0} CPs · precio del Excel
          </span>
        </form>
      </div>

      <section>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            alignItems: "center",
            marginBottom: "0.5rem",
          }}
        >
          <form
            method="get"
            style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}
          >
            <select
              name="proveedor"
              defaultValue={proveedorFilter}
              style={{ width: "auto", padding: "0.3rem 0.45rem" }}
            >
              <option value="">Todos</option>
              <option value="fastrack">fastrack</option>
              <option value="smartpost">smartpost</option>
            </select>
            <input
              name="cp"
              defaultValue={cpFilter}
              placeholder="CP"
              style={{ width: "6rem", padding: "0.3rem 0.45rem" }}
            />
            <button type="submit" className="btn btn-ghost" style={{ padding: "0.3rem 0.6rem" }}>
              Filtrar
            </button>
          </form>
          <form
            action={clearProveedorAction}
            style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}
          >
            <select
              name="proveedor"
              defaultValue="fastrack"
              required
              style={{ width: "auto", padding: "0.3rem 0.45rem" }}
            >
              <option value="fastrack">fastrack</option>
              <option value="smartpost">smartpost</option>
            </select>
            <button type="submit" className="btn btn-ghost" style={{ padding: "0.3rem 0.6rem" }}>
              Vaciar
            </button>
          </form>
          <span className="muted" style={{ fontSize: "0.8rem", marginLeft: "auto" }}>
            {total} · pág. {page}/{totalPages}
          </span>
        </div>

        <table className="table table-compact">
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
                    <button
                      type="submit"
                      className="btn btn-ghost"
                      style={{ padding: "0.15rem 0.45rem", fontSize: "0.8rem" }}
                    >
                      Eliminar
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={6} className="muted">
                  No hay códigos postales cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            {page > 1 && (
              <Link
                className="btn btn-ghost"
                style={{ padding: "0.3rem 0.6rem" }}
                href={`/admin/envios?proveedor=${proveedorFilter}&cp=${encodeURIComponent(cpFilter)}&page=${page - 1}`}
              >
                Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                className="btn btn-ghost"
                style={{ padding: "0.3rem 0.6rem" }}
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
