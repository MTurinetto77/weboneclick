import Link from "next/link";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";

type SearchParams = Promise<{
  desde?: string;
  hasta?: string;
  tipo_entrega?: string;
  estado?: string;
  page?: string;
}>;

const PAGE_SIZE = 20;

const ESTADOS = ["pendiente", "confirmada", "cancelada", "entregada"] as const;
const TIPOS_ENTREGA = [
  { value: "envio", label: "Envío" },
  { value: "retiro", label: "Retiro" },
] as const;

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfDay(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function endOfDay(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

function defaultDateRange() {
  const hasta = new Date();
  const desde = new Date();
  desde.setDate(desde.getDate() - 7);
  return {
    desde: toDateInputValue(desde),
    hasta: toDateInputValue(hasta),
  };
}

function labelEntrega(tipo: string) {
  return tipo === "retiro" ? "Retiro" : tipo === "envio" ? "Envío" : tipo;
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

export default async function AdminVentasPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const defaults = defaultDateRange();
  const desde = params.desde || defaults.desde;
  const hasta = params.hasta || defaults.hasta;
  const tipo_entrega = params.tipo_entrega?.trim() || "";
  const estado = params.estado?.trim() || "";
  const page = Math.max(1, Number(params.page || 1) || 1);

  const where: Prisma.ventaWhereInput = {
    fecha_hora: {
      gte: startOfDay(desde),
      lte: endOfDay(hasta),
    },
  };
  if (tipo_entrega === "envio" || tipo_entrega === "retiro") {
    where.tipo_entrega = tipo_entrega;
  }
  if (estado) {
    where.estado = estado;
  }

  const [ventas, total] = await Promise.all([
    prisma.venta.findMany({
      where,
      include: {
        cliente: true,
        pagos: true,
      },
      orderBy: { fecha_hora: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.venta.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function hrefFor(nextPage: number) {
    const sp = new URLSearchParams();
    sp.set("desde", desde);
    sp.set("hasta", hasta);
    if (tipo_entrega) sp.set("tipo_entrega", tipo_entrega);
    if (estado) sp.set("estado", estado);
    if (nextPage > 1) sp.set("page", String(nextPage));
    return `/admin/ventas?${sp.toString()}`;
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Ventas</h1>

      <form className="admin-filters" action="/admin/ventas" method="get">
        <div className="form-field">
          <label>Desde</label>
          <input type="date" name="desde" defaultValue={desde} required />
        </div>
        <div className="form-field">
          <label>Hasta</label>
          <input type="date" name="hasta" defaultValue={hasta} required />
        </div>
        <div className="form-field">
          <label>Tipo de entrega</label>
          <select name="tipo_entrega" defaultValue={tipo_entrega}>
            <option value="">Todos</option>
            {TIPOS_ENTREGA.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label>Estado</label>
          <select name="estado" defaultValue={estado}>
            <option value="">Todos</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-filters-actions">
          <button className="btn btn-secondary" type="submit">
            Filtrar
          </button>
          <Link href="/admin/ventas" className="btn btn-ghost">
            Última semana
          </Link>
        </div>
      </form>

      <p className="muted">
        {total} venta{total === 1 ? "" : "s"}
        {totalPages > 1 ? ` · página ${page} de ${totalPages}` : ""}
      </p>

      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Fecha</th>
            <th>Cliente</th>
            <th>Entrega</th>
            <th>Estado</th>
            <th>Pago</th>
            <th>Total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {ventas.length === 0 ? (
            <tr>
              <td colSpan={8} className="muted">
                No hay ventas en el período seleccionado.
              </td>
            </tr>
          ) : (
            ventas.map((v) => {
              const pago = v.pagos[0];
              return (
                <tr key={v.id_venta}>
                  <td>#{v.id_venta}</td>
                  <td>{formatDateTime(v.fecha_hora)}</td>
                  <td>
                    {v.cliente.nombre} {v.cliente.apellido}
                    <br />
                    <span className="muted">{v.cliente.mail}</span>
                  </td>
                  <td>{labelEntrega(v.tipo_entrega)}</td>
                  <td>{v.estado}</td>
                  <td>
                    {pago ? (
                      <>
                        {pago.tipo_pago}
                        <br />
                        <span className="muted">{pago.estado}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{formatPrice(v.total)}</td>
                  <td>
                    <Link href={`/admin/ventas/${v.id_venta}`}>Ver</Link>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="pagination">
          {page > 1 && (
            <Link href={hrefFor(page - 1)} className="btn btn-ghost">
              Anterior
            </Link>
          )}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={hrefFor(p)}
              className={`btn ${p === page ? "btn-secondary" : "btn-ghost"}`}
            >
              {p}
            </Link>
          ))}
          {page < totalPages && (
            <Link href={hrefFor(page + 1)} className="btn btn-ghost">
              Siguiente
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
