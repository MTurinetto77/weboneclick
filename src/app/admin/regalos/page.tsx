import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

function fmtFecha(d: Date | null | undefined) {
  if (!d) return "—";
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtMonto(n: { toString(): string } | number) {
  return Number(n).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  });
}

export default async function AdminRegalosPage() {
  await requireAdmin();
  const regalos = await prisma.regalo.findMany({
    include: {
      _count: { select: { productos: true } },
      usuario_creacion: { select: { mail: true } },
    },
    orderBy: [{ activo: "desc" }, { monto_minimo: "desc" }, { id_regalo: "desc" }],
  });

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
          <h1 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Regalos</h1>
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            SKUs de obsequio cuando el carrito supera un monto mínimo.
          </p>
        </div>
        <Link href="/admin/regalos/nuevo" className="btn btn-primary" style={{ padding: "0.35rem 0.75rem" }}>
          Crear
        </Link>
      </div>

      <table className="table table-compact">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Monto mín.</th>
            <th>Vigencia</th>
            <th>Activo</th>
            <th>SKUs</th>
            <th>Usuario</th>
            <th>Creado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {regalos.map((r) => (
            <tr key={r.id_regalo}>
              <td>{r.id_regalo}</td>
              <td>{r.nombre}</td>
              <td>{fmtMonto(r.monto_minimo)}</td>
              <td>
                {fmtFecha(r.vigencia_desde)}
                {" → "}
                {r.vigencia_hasta ? fmtFecha(r.vigencia_hasta) : "sin fin"}
              </td>
              <td>{r.activo ? "Sí" : "No"}</td>
              <td>{r._count.productos}</td>
              <td>{r.usuario_creacion.mail}</td>
              <td>{fmtFecha(r.fecha_creacion)}</td>
              <td>
                <Link href={`/admin/regalos/${r.id_regalo}`}>Editar</Link>
              </td>
            </tr>
          ))}
          {!regalos.length && (
            <tr>
              <td colSpan={9} className="muted">
                No hay regalos cargados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
