/**
 * Escritura en Odoo (Oneclick Argentino SRL, company_id=1).
 */

import { executeKw, getOdooReadContext, searchRead } from "@/lib/odoo";
import { getOdooConfig } from "@/lib/odoo-config";

async function getWriteContext() {
  const cfg = await getOdooConfig();
  return getOdooReadContext({
    allowed_company_ids: [cfg.companyId],
    company_id: cfg.companyId,
  });
}

export async function odooCreate(
  model: string,
  values: Record<string, unknown>
): Promise<number> {
  return executeKw<number>(model, "create", [values], {
    context: await getWriteContext(),
  });
}

export async function odooWrite(
  model: string,
  ids: number[],
  values: Record<string, unknown>
): Promise<boolean> {
  return executeKw<boolean>(model, "write", [ids, values], {
    context: await getWriteContext(),
  });
}

export async function odooSearch(
  model: string,
  domain: unknown[],
  options: { limit?: number; order?: string } = {}
): Promise<number[]> {
  return executeKw<number[]>(model, "search", [domain], {
    limit: options.limit ?? 10,
    order: options.order ?? "id asc",
    context: await getWriteContext(),
  });
}

export async function odooRead<T extends Record<string, unknown>>(
  model: string,
  ids: number[],
  fields: string[]
): Promise<T[]> {
  if (!ids.length) return [];
  return executeKw<T[]>(model, "read", [ids, fields], {
    context: await getWriteContext(),
  });
}

export async function odooSearchRead<T extends Record<string, unknown>>(
  model: string,
  domain: unknown[],
  fields: string[],
  options: { limit?: number } = {}
): Promise<T[]> {
  return searchRead<T>(model, domain, fields, {
    limit: options.limit ?? 10,
  });
}

export async function odooCallMethod<T>(
  model: string,
  method: string,
  ids: number[],
  args: unknown[] = []
): Promise<T> {
  return executeKw<T>(model, method, [ids, ...args], {
    context: await getWriteContext(),
  });
}
