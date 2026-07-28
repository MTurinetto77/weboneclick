import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ mp?: string }>;

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  return { title: `Pedido #${id}` };
}

export default async function ConfirmacionPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { mp } = await searchParams;
  const id_venta = Number(id);
  if (!id_venta) notFound();

  const venta = await prisma.venta.findUnique({
    where: { id_venta },
    include: {
      cliente: true,
      detalles: { orderBy: { item: "asc" } },
      pagos: true,
      envios: { include: { direccion: true } },
      tienda_retiro: true,
    },
  });
  if (!venta) notFound();

  const pago = venta.pagos[0];
  const envio = venta.envios[0];

  return (
    <section className="section">
      <div className="container">
        <div className="admin-card confirmation-card">
          <h1 style={{ marginTop: 0 }}>
            {pago?.estado === "aprobado"
              ? "¡Pago aprobado!"
              : mp === "failure"
                ? "No pudimos procesar el pago"
                : "Recibimos tu pedido"}
          </h1>
          <p className="muted">Número de venta #{venta.id_venta}</p>
          {venta.odoo_order_name && (
            <p className="muted">Pedido Odoo: {venta.odoo_order_name}</p>
          )}

          <p>
            Gracias {venta.cliente.nombre}. Registramos tu pedido por{" "}
            <strong>{formatPrice(venta.total)}</strong>.
          </p>

          {pago && ["mercado_pago", "tarjeta"].includes(pago.tipo_pago) ? (
            <div className="alert alert-info">
              {pago.estado === "aprobado"
                ? venta.odoo_sync_estado === "ok"
                  ? "Mercado Pago confirmó el pago. Tu pedido fue registrado en nuestro sistema."
                  : venta.odoo_sync_estado === "error"
                    ? "Mercado Pago confirmó el pago. Estamos procesando el registro interno; si el problema persiste contactanos."
                    : "Mercado Pago confirmó el pago. Estamos registrando tu pedido en nuestro sistema."
                : mp === "failure"
                  ? "El pago fue rechazado o cancelado. Podés volver al carrito para intentarlo nuevamente."
                  : "Estamos verificando el pago con Mercado Pago. Actualizaremos el pedido cuando recibamos la confirmación."}
            </div>
          ) : venta.tipo_entrega === "retiro" ? (
            <div className="alert alert-info">
              Elegiste <strong>retiro en tienda</strong>
              {venta.tienda_retiro && (
                <p style={{ marginBottom: 0 }}>
                  <strong>{venta.tienda_retiro.nombre}</strong>
                  <br />
                  {venta.tienda_retiro.direccion}, {venta.tienda_retiro.localidad}
                  {venta.tienda_retiro.horarios && (
                    <>
                      <br />
                      {venta.tienda_retiro.horarios}
                    </>
                  )}
                </p>
              )}
            </div>
          ) : (
            <div className="alert alert-info">
              Elegiste <strong>envío a domicilio</strong>. El pedido quedó pendiente de pago.
              {envio?.direccion && (
                <p style={{ marginBottom: 0 }}>
                  Envío a: {envio.direccion.calle} {envio.direccion.numero}
                  {envio.direccion.piso ? `, piso ${envio.direccion.piso}` : ""}
                  {envio.direccion.departamento ? ` ${envio.direccion.departamento}` : ""},{" "}
                  {envio.direccion.localidad}, {envio.direccion.provincia}.
                </p>
              )}
            </div>
          )}

          <h2>Detalle</h2>
          <ul className="order-summary-list">
            {venta.detalles.map((d) => (
              <li key={d.item}>
                <span>
                  {d.nombre_producto} × {Number(d.cantidad)}
                </span>
                <strong>{formatPrice(d.subtotal)}</strong>
              </li>
            ))}
          </ul>

          <div className="order-summary-totals">
            <div>
              <span>Subtotal</span>
              <strong>{formatPrice(venta.subtotal)}</strong>
            </div>
            <div>
              <span>Envío</span>
              <strong>{formatPrice(venta.costo_envio)}</strong>
            </div>
            <div className="order-total">
              <span>Total</span>
              <strong>{formatPrice(venta.total)}</strong>
            </div>
            {pago && (
              <div>
                <span>Pago</span>
                <strong>
                  {pago.tipo_pago} · {pago.estado}
                </strong>
              </div>
            )}
          </div>

          <div className="actions">
            <Link href="/shop" className="btn btn-primary">
              Seguir comprando
            </Link>
            <Link href="/" className="btn btn-ghost">
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
