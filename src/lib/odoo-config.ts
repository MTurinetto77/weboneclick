/**
 * Configuración de integración Odoo (checkout / sync ventas).
 * Valores en tabla `parametro`, grupo `odoo`.
 */

import { parseParamNumber, upsertParametro } from "@/lib/parametros";
import { prisma } from "@/lib/prisma";

export const GRUPO_ODOO = "odoo";

export type OdooConfig = {
  companyId: number;
  saleOrderTypeId: number;
  saleTeamId: number;
  pricelistId: number;
  fiscalPositionId: number;
  paymentTermId: number;
  currencyId: number;
  paymentJournalId: number;
  paymentMethodLineId: number;
  receiptbookId: number;
  shippingProductId: number;
  orderPrefix: string;
  identificationTypeDni: number;
  identificationTypeCuit: number;
  afipResponsibilityCf: number;
  afipResponsibilityRi: number;
  countryArgentina: number;
  createInvoice: boolean;
  syncEnabled: boolean;
  syncMaxIntentos: number;
};

export const ODOO_PARAM_DEFS: {
  nombre: string;
  tipo: string;
  valor: string;
}[] = [
  { nombre: "odoo_company_id", tipo: "number", valor: "1" },
  { nombre: "odoo_sale_order_type_id", tipo: "number", valor: "38" },
  { nombre: "odoo_sale_team_id", tipo: "number", valor: "2" },
  { nombre: "odoo_pricelist_id", tipo: "number", valor: "9" },
  { nombre: "odoo_fiscal_position_id", tipo: "number", valor: "16" },
  { nombre: "odoo_payment_term_id", tipo: "number", valor: "1" },
  { nombre: "odoo_currency_id", tipo: "number", valor: "20" },
  { nombre: "odoo_payment_journal_id", tipo: "number", valor: "104" },
  { nombre: "odoo_payment_method_line_id", tipo: "number", valor: "174" },
  { nombre: "odoo_receiptbook_id", tipo: "number", valor: "2" },
  { nombre: "odoo_shipping_product_id", tipo: "number", valor: "8255" },
  { nombre: "odoo_order_prefix", tipo: "string", valor: "OCWN" },
  { nombre: "odoo_id_type_dni", tipo: "number", valor: "5" },
  { nombre: "odoo_id_type_cuit", tipo: "number", valor: "4" },
  { nombre: "odoo_afip_cf", tipo: "number", valor: "5" },
  { nombre: "odoo_afip_ri", tipo: "number", valor: "1" },
  { nombre: "odoo_country_ar", tipo: "number", valor: "10" },
  { nombre: "odoo_create_invoice", tipo: "boolean", valor: "false" },
  { nombre: "odoo_sync_enabled", tipo: "boolean", valor: "true" },
  { nombre: "odoo_sync_max_intentos", tipo: "number", valor: "5" },
];

const DEFAULTS: OdooConfig = {
  companyId: 1,
  saleOrderTypeId: 38,
  saleTeamId: 2,
  pricelistId: 9,
  fiscalPositionId: 16,
  paymentTermId: 1,
  currencyId: 20,
  paymentJournalId: 104,
  paymentMethodLineId: 174,
  receiptbookId: 2,
  shippingProductId: 8255,
  orderPrefix: "OCWN",
  identificationTypeDni: 5,
  identificationTypeCuit: 4,
  afipResponsibilityCf: 5,
  afipResponsibilityRi: 1,
  countryArgentina: 10,
  createInvoice: false,
  syncEnabled: true,
  syncMaxIntentos: 5,
};

let cached: OdooConfig | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60_000;

function parseBoolean(raw: string | undefined, fallback: boolean): boolean {
  if (raw == null || raw === "") return fallback;
  const s = raw.trim().toLowerCase();
  if (s === "true" || s === "1" || s === "yes" || s === "si") return true;
  if (s === "false" || s === "0" || s === "no") return false;
  return fallback;
}

function intParam(
  params: Record<string, string>,
  nombre: string,
  fallback: number
): number {
  const n = parseParamNumber(params[nombre] ?? "");
  return n != null && Number.isInteger(n) ? n : fallback;
}

function buildConfig(params: Record<string, string>): OdooConfig {
  return {
    companyId: intParam(params, "odoo_company_id", DEFAULTS.companyId),
    saleOrderTypeId: intParam(params, "odoo_sale_order_type_id", DEFAULTS.saleOrderTypeId),
    saleTeamId: intParam(params, "odoo_sale_team_id", DEFAULTS.saleTeamId),
    pricelistId: intParam(params, "odoo_pricelist_id", DEFAULTS.pricelistId),
    fiscalPositionId: intParam(params, "odoo_fiscal_position_id", DEFAULTS.fiscalPositionId),
    paymentTermId: intParam(params, "odoo_payment_term_id", DEFAULTS.paymentTermId),
    currencyId: intParam(params, "odoo_currency_id", DEFAULTS.currencyId),
    paymentJournalId: intParam(params, "odoo_payment_journal_id", DEFAULTS.paymentJournalId),
    paymentMethodLineId: intParam(
      params,
      "odoo_payment_method_line_id",
      DEFAULTS.paymentMethodLineId
    ),
    receiptbookId: intParam(params, "odoo_receiptbook_id", DEFAULTS.receiptbookId),
    shippingProductId: intParam(params, "odoo_shipping_product_id", DEFAULTS.shippingProductId),
    orderPrefix: params.odoo_order_prefix?.trim() || DEFAULTS.orderPrefix,
    identificationTypeDni: intParam(params, "odoo_id_type_dni", DEFAULTS.identificationTypeDni),
    identificationTypeCuit: intParam(params, "odoo_id_type_cuit", DEFAULTS.identificationTypeCuit),
    afipResponsibilityCf: intParam(params, "odoo_afip_cf", DEFAULTS.afipResponsibilityCf),
    afipResponsibilityRi: intParam(params, "odoo_afip_ri", DEFAULTS.afipResponsibilityRi),
    countryArgentina: intParam(params, "odoo_country_ar", DEFAULTS.countryArgentina),
    createInvoice: parseBoolean(params.odoo_create_invoice, DEFAULTS.createInvoice),
    syncEnabled: parseBoolean(params.odoo_sync_enabled, DEFAULTS.syncEnabled),
    syncMaxIntentos: intParam(params, "odoo_sync_max_intentos", DEFAULTS.syncMaxIntentos),
  };
}

export function invalidateOdooConfigCache(): void {
  cached = null;
  cachedAt = 0;
}

/** Config Odoo desde parámetros DB (cache 60s). */
export async function getOdooConfig(): Promise<OdooConfig> {
  const now = Date.now();
  if (cached && now - cachedAt < CACHE_TTL_MS) return cached;

  const rows = await prisma.parametro.findMany({
    where: { grupo_parametros: GRUPO_ODOO },
  });
  const params = Object.fromEntries(rows.map((r) => [r.nombre, r.valor]));
  cached = buildConfig(params);
  cachedAt = now;
  return cached;
}

/** Sync habilitado en DB y credenciales presentes en env. */
export async function isOdooSyncEnabled(): Promise<boolean> {
  const cfg = await getOdooConfig();
  const hasCredentials = Boolean(
    process.env.ODOO_API_KEY?.trim() || process.env.ODOO_UID
  );
  return cfg.syncEnabled && hasCredentials;
}

/** Inserta/actualiza parámetros Odoo en seed. */
export async function seedOdooParametros(): Promise<void> {
  for (const def of ODOO_PARAM_DEFS) {
    await upsertParametro({
      nombre: def.nombre,
      tipo: def.tipo,
      valor: def.valor,
      grupo_parametros: GRUPO_ODOO,
    });
  }
}
