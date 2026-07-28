/**
 * Cliente JSON-RPC para el Odoo de OneClick (oneclick.adhoc.ar).
 *
 * Esquema: POST {ODOO_URL}/jsonrpc con
 *   { service: 'object', method: 'execute_kw', args: [db, uid, apiKey, model, action, args, kwargs] }
 */

const ODOO_URL = process.env.ODOO_URL ?? "https://oneclick.adhoc.ar";
const ODOO_DB = process.env.ODOO_DB ?? "odoo";
const ODOO_UID = process.env.ODOO_UID ? Number(process.env.ODOO_UID) : null;
const ODOO_API_KEY = process.env.ODOO_API_KEY ?? "";
const ODOO_USERNAME = process.env.ODOO_USERNAME ?? "";
const ODOO_PASSWORD = process.env.ODOO_PASSWORD ?? "";

let cachedCookie: string | null = null;
let cachedUid: number | null = ODOO_UID;

interface JsonRpcResponse<T> {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
}

async function jsonRpcCall<T>(body: unknown, attempt = 1): Promise<T> {
  const maxAttempts = 4;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (cachedCookie) headers.Cookie = cachedCookie;

  try {
    const res = await fetch(`${ODOO_URL}/jsonrpc`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      const match = /INGRESSCOOKIE=[^;]+/.exec(setCookie);
      if (match) cachedCookie = match[0];
    }

    if (!res.ok) {
      throw new Error(`Odoo HTTP ${res.status}: ${res.statusText}`);
    }
    const json = (await res.json()) as JsonRpcResponse<T>;
    if (json.error) {
      const data = json.error.data as
        | { message?: string; name?: string; debug?: string }
        | string
        | undefined;
      const detail =
        typeof data === "string" ? data : data?.message ?? data?.debug?.split("\n")[0];
      throw new Error(`Odoo RPC error: ${json.error.message}${detail ? ` — ${detail}` : ""}`);
    }
    return json.result as T;
  } catch (error) {
    const retryable =
      attempt < maxAttempts &&
      error instanceof Error &&
      (/terminated|other side closed|ECONNRESET|ETIMEDOUT|fetch failed|socket/i.test(
        error.message
      ) ||
        (error as { cause?: { code?: string } }).cause?.code === "UND_ERR_SOCKET");

    if (!retryable) throw error;

    const delayMs = 1000 * 2 ** (attempt - 1);
    await new Promise((r) => setTimeout(r, delayMs));
    return jsonRpcCall<T>(body, attempt + 1);
  }
}

async function authenticate(): Promise<number> {
  if (cachedUid) return cachedUid;
  if (!ODOO_USERNAME || !ODOO_PASSWORD) {
    throw new Error(
      "Para autenticar a Odoo definir ODOO_UID en .env o bien ODOO_USERNAME y ODOO_PASSWORD."
    );
  }
  const uid = await jsonRpcCall<number | false>({
    jsonrpc: "2.0",
    method: "call",
    params: {
      service: "common",
      method: "login",
      args: [ODOO_DB, ODOO_USERNAME, ODOO_PASSWORD],
    },
    id: 1,
  });
  if (!uid) throw new Error("Login a Odoo falló: credenciales inválidas.");
  cachedUid = uid as number;
  return cachedUid;
}

export async function executeKw<T>(
  model: string,
  method: string,
  args: unknown[],
  kwargs: Record<string, unknown> = {}
): Promise<T> {
  const uid = await authenticate();
  return jsonRpcCall<T>({
    jsonrpc: "2.0",
    method: "call",
    params: {
      service: "object",
      method: "execute_kw",
      args: [ODOO_DB, uid, ODOO_API_KEY, model, method, args, kwargs],
    },
    id: Date.now(),
  });
}

export async function searchRead<T extends Record<string, unknown>>(
  model: string,
  domain: unknown[] = [],
  fields: string[] = [],
  options: { limit?: number; offset?: number; order?: string } = {}
): Promise<T[]> {
  return executeKw<T[]>(model, "search_read", [domain], {
    fields,
    limit: options.limit ?? 500,
    offset: options.offset ?? 0,
    order: options.order ?? "id asc",
  });
}

export async function searchCount(model: string, domain: unknown[] = []): Promise<number> {
  return executeKw<number>(model, "search_count", [domain]);
}

export async function readGroup(
  model: string,
  domain: unknown[],
  fields: string[],
  groupby: string[],
  options: { lazy?: boolean } = {}
): Promise<Record<string, unknown>[]> {
  return executeKw(model, "read_group", [domain, fields, groupby], {
    lazy: options.lazy ?? false,
  });
}

export type OdooMany2One = [number, string] | false;

export function m2oId(value: OdooMany2One | number | false | null | undefined): number | null {
  if (value == null || value === false) return null;
  if (typeof value === "number") return value;
  if (Array.isArray(value)) return value[0] ?? null;
  return null;
}

export function m2oName(value: OdooMany2One | false | null | undefined): string | null {
  if (!value || !Array.isArray(value)) return null;
  return value[1] ?? null;
}
