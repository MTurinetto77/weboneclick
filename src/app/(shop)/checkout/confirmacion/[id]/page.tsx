import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";

type Params = Promise<{ id: string }>;

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  return { title: `Pedido #${id}` };
}

export default async function ConfirmacionPage({ params }: { params: Params }) {
  const { id } = await params;
  const id_venta = Number(id);
  if (!id_venta) notFound();

  const venta = await prisma.venta.findUnique({
    where: { id_venta },
    include: {
      cliente: true,
      detalles: { orderBy: { item: "asc" } },
      pagos: true,
      envios: { include: { direccion: true } },
    },
  });
  if (!venta) notFound();

  const pago = venta.pagos[0];
  const envio = venta.envios[0];

  return (
    <section className="section">
      <div className="container">
        <div className="admin-card confirmation-card">
          <h1 style={{ marginTop: 0 }}>¡Pedido confirmado!</h1>
          <p className="muted">Número de venta #{venta.id_venta}</p>

          <p>
            Gracias {venta.cliente.nombre}. Registramos tu pedido por{" "}
            <strong>{formatPrice(venta.total)}</strong>.
          </p>

          {venta.tipo_entrega === "retiro" ? (
            <div className="alert alert-info">
              Elegiste <strong>retiro en tienda</strong>
              {pago?.tipo_pago === "tienda"
                ? " con pago en el local. Te esperamos para abonar y retirar."
                : ". El pago online estará disponible próximamente; por ahora el pedido quedó pendiente de pago."}
            </div>
          ) : (
            <div className="alert alert-info">
              Elegiste <strong>envío a domicilio</strong>. El pago online con MercadoPago estará
              disponible próximamente; el pedido quedó pendiente de pago.
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
            <Link href="/catalogo" className="btn btn-primary">
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
