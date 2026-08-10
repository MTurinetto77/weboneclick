import { isMailConfigured, sendMail } from "@/lib/mail";
import { publicSiteUrl } from "@/lib/mercadopago";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";

export type OrderMailLine = {
  nombre: string;
  cantidad: number;
  subtotal: number;
};

export type OrderMailPago = {
  tipo_pago: string;
  estado: string;
  monto: number;
};

export type OrderMailPayload = {
  idVenta: number;
  clienteNombre: string;
  to: string;
  detalles: OrderMailLine[];
  subtotal: number;
  descuento: number;
  costoEnvio: number;
  total: number;
  tipoEntrega: string;
  entregaResumen: string | null;
  pagos: OrderMailPago[];
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(n: number | string | { toString(): string } | null | undefined) {
  return Number(n ?? 0);
}

function labelTipoPago(tipo: string): string {
  if (tipo === "mercado_pago") return "Mercado Pago";
  if (tipo === "tarjeta") return "Tarjeta";
  return tipo;
}

function buildText(payload: OrderMailPayload): string {
  const lines = [
    `Hola ${payload.clienteNombre},`,
    "",
    `Confirmamos tu pedido #${payload.idVenta} en OneClick.`,
    "",
    "Detalle:",
    ...payload.detalles.map(
      (d) =>
        `  - ${d.nombre} × ${d.cantidad} — ${formatPrice(d.subtotal)}`,
    ),
    "",
    `Subtotal: ${formatPrice(payload.subtotal)}`,
  ];

  if (payload.descuento > 0) {
    lines.push(`Descuento: −${formatPrice(payload.descuento)}`);
  }
  lines.push(`Envío: ${formatPrice(payload.costoEnvio)}`);
  lines.push(`Total: ${formatPrice(payload.total)}`);
  lines.push("");

  if (payload.pagos.length > 0) {
    lines.push("Pago:");
    for (const p of payload.pagos) {
      lines.push(
        `  - ${labelTipoPago(p.tipo_pago)} · ${p.estado} · ${formatPrice(p.monto)}`,
      );
    }
    lines.push("");
  }

  if (payload.entregaResumen) {
    if (payload.tipoEntrega === "retiro") {
      lines.push("Retiro en tienda:");
      lines.push("Tu pedido ya está listo para retirar.");
      lines.push(payload.entregaResumen);
    } else {
      lines.push("Envío a domicilio:");
      lines.push(payload.entregaResumen);
    }
    lines.push("");
  }

  lines.push("Gracias por comprar en OneClick.");
  lines.push(publicSiteUrl());
  return lines.join("\n");
}

function buildHtml(payload: OrderMailPayload): string {
  const logoUrl = `${publicSiteUrl()}/oneclick/logo.svg`;
  const detalleRows = payload.detalles
    .map(
      (d) =>
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;">${escapeHtml(d.nombre)} × ${d.cantidad}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;">${escapeHtml(formatPrice(d.subtotal))}</td>
        </tr>`,
    )
    .join("");

  const pagoRows = payload.pagos
    .map(
      (p) =>
        `<tr>
          <td style="padding:4px 0;">${escapeHtml(labelTipoPago(p.tipo_pago))} · ${escapeHtml(p.estado)}</td>
          <td style="padding:4px 0;text-align:right;">${escapeHtml(formatPrice(p.monto))}</td>
        </tr>`,
    )
    .join("");

  const descuentoRow =
    payload.descuento > 0
      ? `<tr>
          <td style="padding:4px 0;">Descuento</td>
          <td style="padding:4px 0;text-align:right;">−${escapeHtml(formatPrice(payload.descuento))}</td>
        </tr>`
      : "";

  const entregaBlock = payload.entregaResumen
    ? payload.tipoEntrega === "retiro"
      ? `<p style="margin:16px 0 0;color:#333;">
        <strong>Retiro en tienda</strong><br/>
        Tu pedido ya está listo para retirar.<br/>
        ${escapeHtml(payload.entregaResumen).replace(/\n/g, "<br/>")}
      </p>`
      : `<p style="margin:16px 0 0;color:#333;">
        <strong>Envío a domicilio</strong><br/>
        ${escapeHtml(payload.entregaResumen).replace(/\n/g, "<br/>")}
      </p>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#f5f5f7;font-family:Arial,Helvetica,sans-serif;color:#1d1d1f;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f7;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:8px;padding:28px 24px;">
          <tr>
            <td>
              <img src="${escapeHtml(logoUrl)}" alt="OneClick" width="180" style="display:block;margin-bottom:20px;height:auto;" />
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;">Confirmación de pedido</h1>
              <p style="margin:0 0 16px;color:#666;">Pedido #${payload.idVenta}</p>
              <p style="margin:0 0 20px;">Hola ${escapeHtml(payload.clienteNombre)}, confirmamos tu pedido en OneClick.</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:16px;">
                ${detalleRows}
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:8px;">
                <tr>
                  <td style="padding:4px 0;">Subtotal</td>
                  <td style="padding:4px 0;text-align:right;">${escapeHtml(formatPrice(payload.subtotal))}</td>
                </tr>
                ${descuentoRow}
                <tr>
                  <td style="padding:4px 0;">Envío</td>
                  <td style="padding:4px 0;text-align:right;">${escapeHtml(formatPrice(payload.costoEnvio))}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0 4px;font-weight:700;font-size:16px;">Total</td>
                  <td style="padding:8px 0 4px;text-align:right;font-weight:700;font-size:16px;">${escapeHtml(formatPrice(payload.total))}</td>
                </tr>
              </table>
              ${
                payload.pagos.length > 0
                  ? `<p style="margin:16px 0 4px;font-weight:700;">Pago</p>
                     <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${pagoRows}</table>`
                  : ""
              }
              ${entregaBlock}
              <p style="margin:24px 0 0;color:#666;font-size:13px;">Gracias por comprar en OneClick.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function entregaFromVenta(venta: {
  tipo_entrega: string;
  tienda_retiro: {
    nombre: string;
    direccion: string | null;
    localidad: string | null;
    horarios: string | null;
  } | null;
  envios: Array<{
    direccion: {
      calle: string;
      numero: string;
      piso: string | null;
      departamento: string | null;
      localidad: string;
      provincia: string;
    };
  }>;
}): string | null {
  if (venta.tipo_entrega === "retiro" && venta.tienda_retiro) {
    const t = venta.tienda_retiro;
    const parts = [
      t.nombre,
      [t.direccion, t.localidad].filter(Boolean).join(", "),
      t.horarios ? `Horario de atención: ${t.horarios}` : null,
    ].filter(Boolean);
    return parts.join("\n");
  }

  const dir = venta.envios[0]?.direccion;
  if (!dir) return null;
  const pisoDept = [
    dir.piso ? `piso ${dir.piso}` : null,
    dir.departamento || null,
  ]
    .filter(Boolean)
    .join(" ");
  return [
    `${dir.calle} ${dir.numero}${pisoDept ? `, ${pisoDept}` : ""}`,
    `${dir.localidad}, ${dir.provincia}`,
  ].join("\n");
}

export async function buildOrderMailPayloadFromVenta(
  idVenta: number,
  opts?: { to?: string },
): Promise<OrderMailPayload | null> {
  const venta = await prisma.venta.findUnique({
    where: { id_venta: idVenta },
    include: {
      cliente: true,
      detalles: { orderBy: { item: "asc" } },
      pagos: true,
      envios: { include: { direccion: true } },
      tienda_retiro: true,
    },
  });
  if (!venta) return null;

  const to = (opts?.to ?? venta.cliente.mail)?.trim();
  if (!to) return null;

  const pagosMp = venta.pagos.filter((p) =>
    ["mercado_pago", "tarjeta"].includes(p.tipo_pago),
  );

  return {
    idVenta: venta.id_venta,
    clienteNombre: venta.cliente.nombre,
    to,
    detalles: venta.detalles.map((d) => ({
      nombre: d.nombre_producto,
      cantidad: money(d.cantidad),
      subtotal: money(d.subtotal),
    })),
    subtotal: money(venta.subtotal),
    descuento: money(venta.descuento),
    costoEnvio: money(venta.costo_envio),
    total: money(venta.total),
    tipoEntrega: venta.tipo_entrega,
    entregaResumen: entregaFromVenta(venta),
    pagos: (pagosMp.length > 0 ? pagosMp : venta.pagos).map((p) => ({
      tipo_pago: p.tipo_pago,
      estado: p.estado,
      monto: money(p.monto),
    })),
  };
}

export async function sendOrderConfirmationPayload(
  payload: OrderMailPayload,
): Promise<void> {
  if (!isMailConfigured()) {
    console.warn("[order-mail] SMTP no configurado; se omite el envío", {
      idVenta: payload.idVenta,
    });
    return;
  }

  const to = payload.to.trim();
  if (!to) {
    console.warn("[order-mail] sin destinatario; se omite el envío", {
      idVenta: payload.idVenta,
    });
    return;
  }

  await sendMail({
    to,
    subject: `OneClick — Confirmación de pedido #${payload.idVenta}`,
    text: buildText(payload),
    html: buildHtml(payload),
  });

  console.log("[order-mail] sent", { idVenta: payload.idVenta, to });
}

/**
 * Envía el mail de confirmación para una venta pagada.
 * Destinatario por defecto: cliente.mail (override con opts.to).
 */
export async function sendOrderConfirmationEmail(
  idVenta: number,
  opts?: { to?: string },
): Promise<void> {
  const payload = await buildOrderMailPayloadFromVenta(idVenta, opts);
  if (!payload) {
    console.warn("[order-mail] venta o mail no encontrados; se omite", {
      idVenta,
    });
    return;
  }
  await sendOrderConfirmationPayload(payload);
}
