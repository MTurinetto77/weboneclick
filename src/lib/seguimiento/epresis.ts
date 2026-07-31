import {
  type ProveedorSeguimiento,
  type SeguimientoEvento,
  type SeguimientoResultado,
  SeguimientoError,
} from "./types";

const DEFAULT_URLS: Record<ProveedorSeguimiento, string> = {
  fasttrack: "https://fasttracklv.epresis.com/api/v2/seguimiento.json",
  smartpost: "https://smartpostecommerce.epresis.com/api/v2/seguimiento.json",
};

const TIPO_LABEL: Record<ProveedorSeguimiento, string> = {
  fasttrack: "Envío convencional",
  smartpost: "Envío en el día",
};

const TIMEOUT_MS = 8_000;

function providerToken(proveedor: ProveedorSeguimiento): string {
  const envKey =
    proveedor === "fasttrack" ? "FASTRACK_API_TOKEN" : "SMARTPOST_API_TOKEN";
  return (process.env[envKey] || "").trim();
}

function providerUrl(proveedor: ProveedorSeguimiento): string {
  const envKey =
    proveedor === "fasttrack"
      ? "FASTRACK_SEGUIMIENTO_URL"
      : "SMARTPOST_SEGUIMIENTO_URL";
  return (process.env[envKey] || "").trim() || DEFAULT_URLS[proveedor];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function pickString(
  obj: Record<string, unknown> | null,
  keys: string[],
): string | undefined {
  if (!obj) return undefined;
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return undefined;
}

function pickArray(
  obj: Record<string, unknown> | null,
  keys: string[],
): unknown[] | null {
  if (!obj) return null;
  for (const key of keys) {
    const v = obj[key];
    if (Array.isArray(v)) return v;
  }
  return null;
}

function normalizeEvento(raw: unknown): SeguimientoEvento | null {
  const row = asRecord(raw);
  if (!row) return null;

  const estado =
    pickString(row, [
      "estado",
      "estado_nombre",
      "nombre_estado",
      "descripcion",
      "status",
      "evento",
    ]) || "";
  const fecha =
    pickString(row, [
      "fecha",
      "fecha_hora",
      "fecha_estado",
      "created_at",
      "timestamp",
      "date",
    ]) || "";
  const detalle = pickString(row, [
    "detalle",
    "detalles",
    "motivo",
    "observacion",
    "observaciones",
    "comentario",
    "descripcion_adicional",
  ]);

  if (!estado && !fecha && !detalle) return null;
  return {
    fecha: fecha || "—",
    estado: estado || detalle || "Actualización",
    ...(detalle && detalle !== estado ? { detalle } : {}),
  };
}

function extractRoot(payload: unknown): Record<string, unknown> | null {
  const root = asRecord(payload);
  if (!root) return null;
  const nested = asRecord(root.data) || asRecord(root.result) || asRecord(root.guia);
  return nested ?? root;
}

function extractEventos(root: Record<string, unknown> | null): SeguimientoEvento[] {
  if (!root) return [];

  const candidates =
    pickArray(root, [
      "historial",
      "seguimiento",
      "estados",
      "movimientos",
      "tracking",
      "timeline",
      "eventos",
    ]) ||
    (Array.isArray(root) ? (root as unknown[]) : null);

  if (!candidates?.length) return [];

  const eventos: SeguimientoEvento[] = [];
  for (const item of candidates) {
    const ev = normalizeEvento(item);
    if (ev) eventos.push(ev);
  }
  return eventos;
}

function isNotFoundPayload(payload: unknown, httpStatus: number): boolean {
  if (httpStatus === 404) return true;
  const root = asRecord(payload);
  if (!root) return false;
  if (root.success === false) {
    const msg = pickString(root, ["message", "error", "error_details"]) || "";
    return /no\s*encontrad|not\s*found|sin\s*result/i.test(msg);
  }
  return false;
}

function normalizeResultado(
  proveedor: ProveedorSeguimiento,
  remito: string,
  payload: unknown,
): SeguimientoResultado | null {
  const root = extractRoot(payload);
  if (!root) return null;

  if (root.success === false) return null;

  const eventos = extractEventos(root);
  const estadoActual =
    pickString(root, [
      "estado_actual",
      "estado",
      "ultimo_estado",
      "status",
      "estado_nombre",
    ]) ||
    eventos[0]?.estado ||
    "";

  const nroGuia = pickString(root, [
    "nro_guia",
    "numero_guia",
    "guia",
    "tracking",
    "codigo",
  ]);
  const remitoResp = pickString(root, ["remito", "nro_remito", "numero_remito"]);
  const receptor = pickString(root, [
    "receptor",
    "recibido_por",
    "nombre_receptor",
    "destinatario",
  ]);

  // Sin eventos ni estado ni guía → no hay tracking útil
  if (!eventos.length && !estadoActual && !nroGuia) return null;

  return {
    proveedor,
    tipoLabel: TIPO_LABEL[proveedor],
    estadoActual: estadoActual || "Sin estado",
    ...(nroGuia ? { nroGuia } : {}),
    remito: remitoResp || remito,
    ...(receptor ? { receptor } : {}),
    eventos,
  };
}

async function postSeguimiento(
  proveedor: ProveedorSeguimiento,
  remito: string,
): Promise<SeguimientoResultado> {
  const token = providerToken(proveedor);
  if (!token) {
    throw new SeguimientoError(
      "misconfigured",
      `El servicio de ${TIPO_LABEL[proveedor].toLowerCase()} no está configurado.`,
      503,
    );
  }

  const url = providerUrl(proveedor);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  let payload: unknown;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_token: token,
        remito,
        nro_guia: "",
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    const text = await res.text();
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    throw new SeguimientoError(
      "provider_error",
      aborted
        ? "El proveedor de envíos no respondió a tiempo. Intentá de nuevo."
        : "No pudimos consultar el estado del envío. Intentá más tarde.",
      502,
    );
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401 || res.status === 403) {
    throw new SeguimientoError(
      "unauthenticated",
      "Error de autenticación con el proveedor de envíos.",
      502,
    );
  }

  if (isNotFoundPayload(payload, res.status)) {
    throw new SeguimientoError(
      "not_found",
      "No se encontró información para el número de pedido ingresado.",
      404,
    );
  }

  if (!res.ok) {
    throw new SeguimientoError(
      "provider_error",
      "No pudimos consultar el estado del envío. Intentá más tarde.",
      502,
    );
  }

  const normalized = normalizeResultado(proveedor, remito, payload);
  if (!normalized) {
    throw new SeguimientoError(
      "not_found",
      "No se encontró información para el número de pedido ingresado.",
      404,
    );
  }

  return normalized;
}

export async function consultarFasttrack(
  remito: string,
): Promise<SeguimientoResultado> {
  return postSeguimiento("fasttrack", remito);
}

export async function consultarSmartpost(
  remito: string,
): Promise<SeguimientoResultado> {
  return postSeguimiento("smartpost", remito);
}

export { TIPO_LABEL };
