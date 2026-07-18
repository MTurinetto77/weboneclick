import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";

type Params = Promise<{ id: string }>;

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

function labelEntrega(tipo: string) {
  return tipo === "retiro" ? "Retiro en tienda" : tipo === "envio" ? "Envío a domicilio" : tipo;
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <span className="detail-field">
      <span className="muted">{label}:</span> <strong>{value}</strong>
    </span>
  );
}

export default async function AdminVentaDetailPage({ params }: { params: Params }) {
  await requireAdmin();
  const { id } = await params;
  const id_venta = Number(id);
  if (!id_venta) notFound();

  const venta = await prisma.venta.findUnique({
    where: { id_venta },
    include: {
      cliente: true,
      detalles: { orderBy: { item: "asc" }, include: { producto: true } },
      pagos: true,
      envios: { include: { direccion: true } },
    },
  });
  if (!venta) notFound();

  const pago = venta.pagos[0];
  const envio = venta.envios[0];
  const dir = envio?.direccion;

  return (
    <div>
      <p>
        <Link href="/admin/ventas">← Ventas</Link>
      </p>
      <h1 style={{ marginTop: 0 }}>
        Venta #{venta.id_venta}{" "}
        <span className="muted" style={{ fontSize: "1rem", fontWeight: 400 }}>
          · {formatDateTime(venta.fecha_hora)}
        </span>
      </h1>

      <div className="admin-card detail-section">
        <h2>Cliente</h2>
        <div className="detail-row">
          <Field label="Nombre" value={`${venta.cliente.nombre} ${venta.cliente.apellido}`} />
          <Field label="Mail" value={venta.cliente.mail} />
          <Field label="Teléfono" value={venta.cliente.telefono} />
          <Field
            label="Documento"
            value={
              venta.cliente.numero_documento
                ? `${venta.cliente.tipo_documento || "Doc"} ${venta.cliente.numero_documento}`
                : null
            }
          />
        </div>
      </div>

      <div className="admin-card detail-section">
        <h2>Pedido</h2>
        <div className="detail-row">
          <Field label="Estado" value={venta.estado} />
          <Field label="Entrega" value={labelEntrega(venta.tipo_entrega)} />
          <Field
            label="Pago"
            value={pago ? `${pago.tipo_pago} · ${pago.estado}` : null}
          />
          <Field label="Total" value={formatPrice(venta.total)} />
        </div>
      </div>

      {venta.tipo_entrega === "envio" && (
        <div className="admin-card detail-section">
          <h2>Dirección de envío</h2>
          {dir ? (
            <>
              <div className="detail-row">
                <Field label="Calle" value={`${dir.calle} ${dir.numero}`} />
                <Field label="Piso" value={dir.piso} />
                <Field label="Depto" value={dir.departamento} />
                <Field label="Barrio" value={dir.barrio} />
                <Field label="Localidad" value={dir.localidad} />
                <Field label="Provincia" value={dir.provincia} />
                <Field label="CP" value={dir.codigo_postal} />
                <Field label="País" value={dir.pais} />
              </div>
              {(dir.referencias || envio) && (
                <div className="detail-row" style={{ marginTop: "0.45rem" }}>
                  <Field label="Referencias" value={dir.referencias} />
                  <Field label="Estado envío" value={envio?.estado} />
                  <Field label="Tracking" value={envio?.tracking} />
                </div>
              )}
            </>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              No hay dirección de envío registrada.
            </p>
          )}
        </div>
      )}

      {venta.tipo_entrega === "retiro" && (
        <div className="admin-card detail-section">
          <h2>Entrega</h2>
          <div className="detail-row">
            <Field label="Modalidad" value="Retiro en tienda" />
          </div>
        </div>
      )}

      <div className="admin-card detail-section">
        <h2>Detalle</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Producto</th>
              <th>Cant.</th>
              <th>P. unit.</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {venta.detalles.map((d) => (
              <tr key={d.item}>
                <td>{d.item}</td>
                <td>
                  <Link href={`/admin/productos/${d.id_producto}`}>{d.nombre_producto}</Link>
                </td>
                <td>{Number(d.cantidad)}</td>
                <td>{formatPrice(d.precio_unitario)}</td>
                <td>{formatPrice(d.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="detail-row" style={{ justifyContent: "flex-end", marginTop: "0.75rem" }}>
          <Field label="Subtotal" value={formatPrice(venta.subtotal)} />
          <Field label="Descuento" value={formatPrice(venta.descuento)} />
          <Field label="Envío" value={formatPrice(venta.costo_envio)} />
          <Field label="Total" value={formatPrice(venta.total)} />
        </div>
      </div>
    </div>
  );
}
