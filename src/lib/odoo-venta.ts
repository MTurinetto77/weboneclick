/**
 * Sincronización de ventas pagadas hacia Odoo:
 * res.partner → sale.order → account.payment
 */

import { prisma } from "@/lib/prisma";
import { getShippingWarehouseOdooId } from "@/lib/almacenes";
import {
  checkStockOdooWarehouse,
  formatStockShortageMessage,
} from "@/lib/odoo-stock";
import { getOdooConfig, isOdooSyncEnabled, type OdooConfig } from "@/lib/odoo-config";
import {
  odooCallMethod,
  odooCreate,
  odooRead,
  odooSearch,
  odooSearchRead,
  odooWrite,
} from "@/lib/odoo-write";

const round2 = (n: number) => Math.round(n * 100) / 100;

type VentaFull = Awaited<ReturnType<typeof loadVentaForOdoo>>;

async function loadVentaForOdoo(id_venta: number) {
  return prisma.venta.findUniqueOrThrow({
    where: { id_venta },
    include: {
      cliente: true,
      detalles: { include: { producto: true } },
      pagos: true,
      envios: { include: { direccion: true } },
      direccion_facturacion: true,
      tienda_retiro: true,
      cupon: true,
    },
  });
}

/** Resuelve odoo_id del almacén destino según tipo de entrega. */
export async function resolveWarehouseOdooId(
  tipo_entrega: string,
  id_tienda_retiro: number | null
): Promise<number> {
  if (tipo_entrega === "envio") return getShippingWarehouseOdooId();
  if (!id_tienda_retiro) {
    throw new Error("Falta tienda de retiro");
  }
  const almacen = await prisma.almacen.findFirst({
    where: { id_tienda: id_tienda_retiro, odoo_id: { not: null } },
    select: { odoo_id: true },
  });
  if (!almacen?.odoo_id) {
    throw new Error("La tienda seleccionada no tiene almacén Odoo configurado");
  }
  return almacen.odoo_id;
}

// ─── Provincias AR → state_id Odoo ───────────────────────────────────────────

let cachedArStates: { id: number; name: string }[] | null = null;

async function getArgentinaStates(cfg: OdooConfig): Promise<{ id: number; name: string }[]> {
  if (cachedArStates) return cachedArStates;
  const rows = await odooSearchRead<{ id: number; name: string }>(
    "res.country.state",
    [["country_id", "=", cfg.countryArgentina]],
    ["id", "name"],
    { limit: 50 }
  );
  cachedArStates = rows;
  return rows;
}

function normalizeProvince(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(.*\)/g, "")
    .trim();
}

async function resolveStateId(provincia: string, cfg: OdooConfig): Promise<number | false> {
  const states = await getArgentinaStates(cfg);
  const norm = normalizeProvince(provincia);
  const found = states.find((st) => {
    const sn = normalizeProvince(st.name);
    return sn === norm || sn.includes(norm) || norm.includes(sn);
  });
  return found?.id ?? false;
}

function buildStreet(d: {
  calle: string;
  numero: string;
  piso?: string | null;
  departamento?: string | null;
}): string {
  let street = `${d.calle} ${d.numero}`.trim();
  const extra = [d.piso, d.departamento].filter(Boolean).join(" ");
  if (extra) street += ` ${extra}`;
  return street;
}

// ─── Partner ─────────────────────────────────────────────────────────────────

type DireccionData = {
  calle: string;
  numero: string;
  piso?: string | null;
  departamento?: string | null;
  barrio?: string | null;
  localidad: string;
  provincia: string;
  pais?: string | null;
  codigo_postal?: string | null;
  referencias?: string | null;
};

function partnerAddressValues(d: DireccionData, cfg: OdooConfig) {
  return {
    street: buildStreet(d),
    street2: d.barrio || false,
    city: d.localidad,
    zip: d.codigo_postal || false,
    country_id: cfg.countryArgentina,
  };
}

async function upsertOdooPartner(
  venta: NonNullable<VentaFull>,
  cfg: OdooConfig
): Promise<number> {
  const cliente = venta.cliente;
  if (cliente.odoo_partner_id) {
    await prisma.venta.update({
      where: { id_venta: venta.id_venta },
      data: { odoo_partner_id: cliente.odoo_partner_id },
    });
    return cliente.odoo_partner_id;
  }

  const docType =
    cliente.tipo_documento?.toUpperCase() === "CUIT"
      ? cfg.identificationTypeCuit
      : cfg.identificationTypeDni;
  const afipType =
    cliente.responsabilidad_impositiva === "RI"
      ? cfg.afipResponsibilityRi
      : cfg.afipResponsibilityCf;

  let partnerId: number | null = null;

  if (cliente.numero_documento) {
    const ids = await odooSearch("res.partner", [
      ["vat", "=", cliente.numero_documento],
      ["l10n_latam_identification_type_id", "=", docType],
      ["company_id", "in", [cfg.companyId, false]],
      ["parent_id", "=", false],
    ]);
    if (ids[0]) partnerId = ids[0];
  }

  if (!partnerId && cliente.mail) {
    const ids = await odooSearch("res.partner", [
      ["email", "=ilike", cliente.mail],
      ["parent_id", "=", false],
      ["company_id", "in", [cfg.companyId, false]],
    ]);
    if (ids[0]) partnerId = ids[0];
  }

  const factDir = venta.direccion_facturacion;
  const stateId = factDir ? await resolveStateId(factDir.provincia, cfg) : false;

  const baseValues: Record<string, unknown> = {
    name: `${cliente.nombre} ${cliente.apellido}`.trim(),
    email: cliente.mail,
    phone: cliente.telefono || false,
    vat: cliente.numero_documento || false,
    l10n_latam_identification_type_id: cliente.numero_documento ? docType : false,
    l10n_ar_afip_responsibility_type_id: afipType,
    lang: "es_AR",
    company_type:
      cliente.tipo_documento?.toUpperCase() === "CUIT" ? "company" : "person",
    customer_rank: 1,
    company_id: false,
    ...(factDir
      ? {
          ...partnerAddressValues(factDir, cfg),
          state_id: stateId,
        }
      : {}),
  };

  if (partnerId) {
    const [existing] = await odooRead<Record<string, unknown>>(
      "res.partner",
      [partnerId],
      ["phone", "vat", "street", "city", "zip"]
    );
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(baseValues)) {
      if (v === false || v == null) continue;
      const cur = existing?.[k];
      if (cur === false || cur == null || cur === "") {
        patch[k] = v;
      }
    }
    if (Object.keys(patch).length) {
      await odooWrite("res.partner", [partnerId], patch);
    }
  } else {
    partnerId = await odooCreate("res.partner", baseValues);
  }

  await prisma.cliente.update({
    where: { id_cliente: cliente.id_cliente },
    data: { odoo_partner_id: partnerId },
  });
  await prisma.venta.update({
    where: { id_venta: venta.id_venta },
    data: { odoo_partner_id: partnerId },
  });

  return partnerId;
}

async function upsertDeliveryContact(
  venta: NonNullable<VentaFull>,
  partnerId: number,
  cfg: OdooConfig
): Promise<number> {
  if (venta.tipo_entrega !== "envio") return partnerId;

  const envio = venta.envios[0];
  if (!envio?.direccion) return partnerId;

  const deliveryDir = envio.direccion;
  const factDir = venta.direccion_facturacion;

  const sameAsBilling =
    factDir &&
    deliveryDir.calle === factDir.calle &&
    deliveryDir.numero === factDir.numero &&
    deliveryDir.codigo_postal === factDir.codigo_postal &&
    deliveryDir.localidad === factDir.localidad;

  if (sameAsBilling && !venta.receptor_nombre) return partnerId;

  const street = buildStreet(deliveryDir);
  const zip = deliveryDir.codigo_postal || "";
  const deliveryName =
    venta.receptor_nombre ||
    `${venta.cliente.nombre} ${venta.cliente.apellido}`.trim();

  const existing = await odooSearch("res.partner", [
    ["parent_id", "=", partnerId],
    ["type", "=", "delivery"],
    ["street", "=", street],
    ["zip", "=", zip],
  ]);
  if (existing[0]) return existing[0];

  const stateId = await resolveStateId(deliveryDir.provincia, cfg);
  return odooCreate("res.partner", {
    name: deliveryName,
    type: "delivery",
    parent_id: partnerId,
    ...partnerAddressValues(deliveryDir, cfg),
    state_id: stateId,
    comment: deliveryDir.referencias || false,
  });
}

// ─── Sale order ──────────────────────────────────────────────────────────────

type OdooTax = { id: number; amount: number };
type OdooProduct = { id: number; taxes_id: number[] };

async function loadOdooProductTaxes(
  odooProductIds: number[]
): Promise<Map<number, OdooProduct>> {
  const map = new Map<number, OdooProduct>();
  if (!odooProductIds.length) return map;

  const rows = await odooRead<{ id: number; taxes_id: number[] }>(
    "product.product",
    odooProductIds,
    ["id", "taxes_id"]
  );
  for (const row of rows) {
    map.set(row.id, { id: row.id, taxes_id: row.taxes_id ?? [] });
  }
  return map;
}

async function loadTaxRates(taxIds: number[]): Promise<Map<number, OdooTax>> {
  const map = new Map<number, OdooTax>();
  if (!taxIds.length) return map;
  const rows = await odooRead<OdooTax>("account.tax", taxIds, ["id", "amount"]);
  for (const row of rows) map.set(row.id, row);
  return map;
}

function grossToNet(gross: number, taxRate: number): number {
  if (taxRate <= 0) return round2(gross);
  return round2(gross / (1 + taxRate));
}

/**
 * En instancias de prueba a veces hay impuestos duplicados (ej. IVA 21% + 19%).
 * Nos quedamos con un solo IVA AR de venta (21 o 10.5).
 */
function pickSaleTaxes(
  taxIds: number[],
  taxRateMap: Map<number, OdooTax>
): number[] {
  const ar = taxIds.filter((id) => {
    const amount = taxRateMap.get(id)?.amount;
    return amount === 21 || amount === 10.5;
  });
  if (ar.length === 1) return ar;
  if (ar.length > 1) {
    const t21 = ar.find((id) => taxRateMap.get(id)?.amount === 21);
    return [t21 ?? ar[0]];
  }
  if (!taxIds.length) return [];
  return [
    taxIds.reduce((best, id) =>
      (taxRateMap.get(id)?.amount ?? 0) > (taxRateMap.get(best)?.amount ?? 0)
        ? id
        : best
    ),
  ];
}

async function createOdooSaleOrder(
  venta: NonNullable<VentaFull>,
  partnerId: number,
  shippingPartnerId: number,
  warehouseOdooId: number,
  cfg: OdooConfig
): Promise<{ orderId: number; orderName: string }> {
  const orderName = `${cfg.orderPrefix}-${venta.id_venta}`;

  if (venta.odoo_order_id) {
    const [existing] = await odooRead<{ name: string }>(
      "sale.order",
      [venta.odoo_order_id],
      ["name"]
    );
    return {
      orderId: venta.odoo_order_id,
      orderName: existing?.name ?? venta.odoo_order_name ?? orderName,
    };
  }

  const existingIds = await odooSearch("sale.order", [
    ["name", "=", orderName],
    ["company_id", "=", cfg.companyId],
  ]);
  if (existingIds[0]) {
    const [existing] = await odooRead<{ name: string; state: string }>(
      "sale.order",
      [existingIds[0]],
      ["name", "state"]
    );
    await prisma.venta.update({
      where: { id_venta: venta.id_venta },
      data: {
        odoo_order_id: existingIds[0],
        odoo_order_name: existing?.name ?? orderName,
        odoo_warehouse_id: warehouseOdooId,
      },
    });
    return { orderId: existingIds[0], orderName: existing?.name ?? orderName };
  }

  const odooProductIds = venta.detalles
    .map((d) => d.producto.odoo_id)
    .filter((id): id is number => id != null);

  const productTaxMap = await loadOdooProductTaxes(odooProductIds);
  const allTaxIds = [
    ...new Set([...productTaxMap.values()].flatMap((p) => p.taxes_id)),
  ];
  const taxRateMap = await loadTaxRates(allTaxIds);

  const orderLines: [number, number, Record<string, unknown>][] = [];

  /**
   * Odoo sale.order.line solo tiene `discount` (%), no monto fijo.
   * El cupón se aplica en el precio cobrado (price_unit) y una línea
   * de referencia a $0 con el código (sin impuestos).
   */
  for (const det of venta.detalles) {
    const odooId = det.producto.odoo_id;
    if (!odooId) throw new Error(`Producto sin odoo_id: ${det.nombre_producto}`);

    const gross = Number(det.precio_cobrado ?? det.precio_unitario);
    const isGift = gross <= 0.009;
    // Misma selección de IVA que productos pagos: si tax_id queda en false,
    // Odoo aplica los taxes del producto y puede fallar por IVA duplicado.
    const taxes = pickSaleTaxes(
      productTaxMap.get(odooId)?.taxes_id ?? [],
      taxRateMap
    );
    const taxRate = taxes.reduce(
      (acc, tid) => acc + (taxRateMap.get(tid)?.amount ?? 0) / 100,
      0
    );

    orderLines.push([
      0,
      0,
      {
        product_id: odooId,
        name: isGift
          ? det.nombre_producto.includes("(Regalo)")
            ? det.nombre_producto
            : `${det.nombre_producto} (Regalo)`
          : det.nombre_producto,
        product_uom_qty: Number(det.cantidad),
        price_unit: isGift ? 0 : grossToNet(gross, taxRate),
        discount: 0,
        tax_id: taxes.length ? [[6, 0, taxes]] : false,
      },
    ]);
  }

  const costoEnvio = Number(venta.costo_envio);
  if (venta.tipo_entrega === "envio" && costoEnvio > 0) {
    orderLines.push([
      0,
      0,
      {
        product_id: cfg.shippingProductId,
        name: "Envío a Domicilio",
        product_uom_qty: 1,
        price_unit: grossToNet(costoEnvio, 0.21),
        discount: 0,
        tax_id: [[6, 0, [116]]],
      },
    ]);
  }

  const notes: string[] = [];
  if (venta.tipo_entrega === "retiro" && venta.tienda_retiro) {
    notes.push(
      `Retiro en tienda: ${venta.tienda_retiro.nombre} — ${venta.tienda_retiro.direccion}`
    );
  }
  if (venta.receptor_nombre) {
    notes.push(
      `Retira/recibe: ${venta.receptor_nombre}${venta.receptor_dni ? ` (DNI ${venta.receptor_dni})` : ""}`
    );
  }

  const internalNotes: string[] = [];
  if (venta.cupon && Number(venta.cupon.monto) > 0.009) {
    const monto = Number(venta.cupon.monto).toLocaleString("es-AR", {
      minimumFractionDigits: 2,
    });
    internalNotes.push(`Cupón web ${venta.cupon.codigo}: −$${monto}`);
  }

  const orderId = await odooCreate("sale.order", {
    name: orderName,
    partner_id: partnerId,
    partner_invoice_id: partnerId,
    partner_shipping_id: shippingPartnerId,
    type_id: cfg.saleOrderTypeId,
    team_id: cfg.saleTeamId,
    company_id: cfg.companyId,
    warehouse_id: warehouseOdooId,
    pricelist_id: cfg.pricelistId,
    currency_id: cfg.currencyId,
    payment_term_id: cfg.paymentTermId,
    fiscal_position_id: cfg.fiscalPositionId,
    picking_policy: "direct",
    client_order_ref: orderName,
    date_order: venta.fecha_hora.toISOString().slice(0, 19).replace("T", " "),
    order_line: orderLines,
    note: notes.length ? notes.join("\n") : false,
    internal_notes: internalNotes.length
      ? internalNotes.map((n) => `<p>${n}</p>`).join("")
      : false,
  });

  // La pricelist de Odoo puede aplicar descuentos promocionales; forzamos
  // price_unit + discount=0 (el cupón web ya está en el precio cobrado).
  const intendedByProduct = new Map<
    number,
    { price_unit: number; discount: number }
  >();
  for (const [, , vals] of orderLines) {
    const productId = Number(vals.product_id);
    const priceUnit = Number(vals.price_unit);
    if (productId && Number.isFinite(priceUnit)) {
      intendedByProduct.set(productId, {
        price_unit: priceUnit,
        discount: Number(vals.discount ?? 0),
      });
    }
  }

  let [created] = await odooRead<{
    amount_total: number;
    order_line: number[];
    name: string;
    state: string;
  }>("sale.order", [orderId], ["amount_total", "order_line", "name", "state"]);

  if (created?.order_line?.length) {
    const lines = await odooRead<{
      id: number;
      product_id: [number, string] | false;
      price_unit: number;
      discount: number;
    }>("sale.order.line", created.order_line, [
      "id",
      "product_id",
      "price_unit",
      "discount",
    ]);
    for (const ln of lines) {
      const productId = Array.isArray(ln.product_id) ? ln.product_id[0] : null;
      if (!productId) continue;
      const intended = intendedByProduct.get(productId);
      if (intended == null) continue;
      if (
        Math.abs(Number(ln.discount) - intended.discount) > 0.01 ||
        Math.abs(Number(ln.price_unit) - intended.price_unit) > 0.01
      ) {
        await odooWrite("sale.order.line", [ln.id], {
          discount: intended.discount,
          price_unit: intended.price_unit,
        });
      }
    }
    [created] = await odooRead<{
      amount_total: number;
      order_line: number[];
      name: string;
      state: string;
    }>("sale.order", [orderId], ["amount_total", "order_line", "name", "state"]);
  }

  const targetTotal = Number(venta.total);
  const odooTotal = Number(created?.amount_total ?? 0);
  const diff = round2(targetTotal - odooTotal);

  if (Math.abs(diff) > 1) {
    throw new Error(
      `Total Odoo (${odooTotal}) no coincide con venta (${targetTotal}), diff=${diff}`
    );
  }

  if (Math.abs(diff) >= 0.01 && created?.order_line?.length) {
    const lineIds = created.order_line;
    const lines = await odooRead<{
      id: number;
      price_unit: number;
      product_uom_qty: number;
    }>("sale.order.line", lineIds, ["id", "price_unit", "product_uom_qty"]);
    // No ajustar líneas de regalo (price_unit 0) ni notas
    const adjustable = lines.filter(
      (ln) => Number(ln.price_unit) > 0.009 && Number(ln.product_uom_qty) > 0,
    );
    let maxLine = adjustable[0];
    for (const ln of adjustable) {
      const curVal = (maxLine?.price_unit ?? 0) * (maxLine?.product_uom_qty ?? 1);
      const lnVal = ln.price_unit * ln.product_uom_qty;
      if (lnVal > curVal) maxLine = ln;
    }
    if (maxLine && maxLine.product_uom_qty > 0) {
      const adjustPerUnit = diff / Number(maxLine.product_uom_qty);
      await odooWrite("sale.order.line", [maxLine.id], {
        price_unit: round2(maxLine.price_unit + adjustPerUnit),
      });
    }
  }

  if (created?.state === "draft") {
    await odooCallMethod("sale.order", "action_confirm", [orderId]);
  }

  const finalName = created?.name ?? orderName;
  await prisma.venta.update({
    where: { id_venta: venta.id_venta },
    data: {
      odoo_order_id: orderId,
      odoo_order_name: finalName,
      odoo_warehouse_id: warehouseOdooId,
    },
  });

  return { orderId, orderName: finalName };
}

// ─── Receipt ─────────────────────────────────────────────────────────────────

async function createOdooReceipt(
  venta: NonNullable<VentaFull>,
  partnerId: number,
  mpPaymentId: string,
  cfg: OdooConfig
): Promise<{ paymentId: number; paymentName: string }> {
  if (venta.odoo_payment_id) {
    const [existing] = await odooRead<{ name: string }>(
      "account.payment",
      [venta.odoo_payment_id],
      ["name"]
    );
    return {
      paymentId: venta.odoo_payment_id,
      paymentName: existing?.name ?? venta.odoo_payment_name ?? "",
    };
  }

  const existingIds = await odooSearch("account.payment", [
    ["memo", "=", mpPaymentId],
    ["partner_id", "=", partnerId],
    ["company_id", "=", cfg.companyId],
  ]);
  if (existingIds[0]) {
    const [existing] = await odooRead<{ name: string; state: string }>(
      "account.payment",
      [existingIds[0]],
      ["name", "state"]
    );
    await prisma.venta.update({
      where: { id_venta: venta.id_venta },
      data: {
        odoo_payment_id: existingIds[0],
        odoo_payment_name: existing?.name ?? null,
      },
    });
    return {
      paymentId: existingIds[0],
      paymentName: existing?.name ?? "",
    };
  }

  const pago = venta.pagos.find(
    (p) => p.tipo_pago === "mercado_pago" || p.tipo_pago === "tarjeta"
  );
  const paymentDate = new Date().toISOString().slice(0, 10);

  const paymentId = await odooCreate("account.payment", {
    payment_type: "inbound",
    partner_type: "customer",
    partner_id: partnerId,
    amount: Number(venta.total),
    date: paymentDate,
    journal_id: cfg.paymentJournalId,
    payment_method_line_id: cfg.paymentMethodLineId,
    receiptbook_id: cfg.receiptbookId,
    currency_id: cfg.currencyId,
    memo: mpPaymentId,
    company_id: cfg.companyId,
  });

  if (cfg.createInvoice && venta.odoo_order_id) {
    try {
      await odooCallMethod("sale.order", "_create_invoices", [venta.odoo_order_id]);
      const invoiceIds = await odooSearch("account.move", [
        ["invoice_origin", "=", venta.odoo_order_name ?? ""],
        ["move_type", "=", "out_invoice"],
      ]);
      if (invoiceIds[0]) {
        const inv = await odooRead<{ state: string; line_ids: number[] }>(
          "account.move",
          [invoiceIds[0]],
          ["state", "line_ids"]
        );
        if (inv[0]?.state === "draft") {
          await odooCallMethod("account.move", "action_post", [invoiceIds[0]]);
        }
        const moveLines = await odooRead<{
          id: number;
          account_type: string;
          reconciled: boolean;
        }>("account.move.line", inv[0]?.line_ids ?? [], [
          "account_type",
          "reconciled",
        ]);
        const receivableLines = moveLines
          .filter((l) => l.account_type === "asset_receivable" && !l.reconciled)
          .map((l) => l.id);
        if (receivableLines.length) {
          await odooWrite("account.payment", [paymentId], {
            to_pay_move_line_ids: [[6, 0, receivableLines]],
          });
        }
      }
    } catch {
      // factura automática en Odoo; no bloquear el recibo
    }
  }

  const [beforePost] = await odooRead<{ state: string }>(
    "account.payment",
    [paymentId],
    ["state"]
  );
  if (beforePost?.state === "draft") {
    await odooCallMethod("account.payment", "action_post", [paymentId]);
  }

  const [posted] = await odooRead<{ name: string }>(
    "account.payment",
    [paymentId],
    ["name"]
  );

  await prisma.venta.update({
    where: { id_venta: venta.id_venta },
    data: {
      odoo_payment_id: paymentId,
      odoo_payment_name: posted?.name ?? null,
    },
  });

  return { paymentId, paymentName: posted?.name ?? "" };
}

// ─── Orquestador ─────────────────────────────────────────────────────────────

export type OdooSyncResult = "ok" | "skipped" | "disabled" | "error";

export async function syncVentaToOdoo(id_venta: number): Promise<OdooSyncResult> {
  if (!(await isOdooSyncEnabled())) return "disabled";

  const cfg = await getOdooConfig();

  const claimed = await prisma.venta.updateMany({
    where: {
      id_venta,
      estado: "pagada",
      odoo_sync_estado: { in: ["pendiente", "error"] },
    },
    data: {
      odoo_sync_estado: "en_proceso",
      odoo_sync_intentos: { increment: 1 },
    },
  });
  if (claimed.count === 0) return "skipped";

  try {
    const venta = await loadVentaForOdoo(id_venta);
    const warehouseOdooId =
      venta.odoo_warehouse_id ??
      (await resolveWarehouseOdooId(
        venta.tipo_entrega,
        venta.id_tienda_retiro
      ));

    if (!venta.odoo_warehouse_id) {
      await prisma.venta.update({
        where: { id_venta },
        data: { odoo_warehouse_id: warehouseOdooId },
      });
    }

    const stockItems = venta.detalles
      .filter((d) => d.producto.odoo_id)
      .map((d) => ({
        odooProductId: d.producto.odoo_id!,
        cantidad: Number(d.cantidad),
        titulo: d.nombre_producto,
      }));

    const shortages = await checkStockOdooWarehouse(stockItems, warehouseOdooId);
    if (shortages.length) {
      throw new Error(formatStockShortageMessage(shortages));
    }

    const partnerId = await upsertOdooPartner(venta, cfg);
    const shippingPartnerId = await upsertDeliveryContact(venta, partnerId, cfg);
    await createOdooSaleOrder(
      venta,
      partnerId,
      shippingPartnerId,
      warehouseOdooId,
      cfg
    );

    const mpIds = venta.pagos
      .filter(
        (p) =>
          (p.tipo_pago === "mercado_pago" || p.tipo_pago === "tarjeta") &&
          p.estado === "aprobado" &&
          p.transaction_id,
      )
      .map((p) => p.transaction_id as string);
    if (mpIds.length === 0) {
      throw new Error("Pago aprobado sin transaction_id de Mercado Pago");
    }
    // Una o más tarjetas: todos los payment id van en el memo del recibo.
    await createOdooReceipt(venta, partnerId, mpIds.join(","), cfg);

    await prisma.venta.update({
      where: { id_venta },
      data: {
        odoo_sync_estado: "ok",
        odoo_sync_error: null,
        odoo_sync_at: new Date(),
      },
    });
    return "ok";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.venta.update({
      where: { id_venta },
      data: {
        odoo_sync_estado: "error",
        odoo_sync_error: message.slice(0, 4000),
      },
    });
    return "error";
  }
}

export { loadVentaForOdoo };
