import { consultarFasttrack, consultarSmartpost } from "./epresis";
import {
  type SeguimientoResultado,
  type TipoEnvioConsulta,
  SeguimientoError,
} from "./types";

const PEDIDO_MAX_LEN = 64;

/** Normaliza y valida el número de pedido / remito ingresado por el cliente. */
export function normalizeNumeroPedido(raw: string): string {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function validateNumeroPedido(numero: string): void {
  if (!numero) {
    throw new SeguimientoError(
      "invalid_input",
      "Ingresá tu número de pedido.",
      400,
    );
  }
  if (numero.length > PEDIDO_MAX_LEN) {
    throw new SeguimientoError(
      "invalid_input",
      "El número de pedido es demasiado largo.",
      400,
    );
  }
  // OCW-123, OCWN-123, guías ePresis, o remito alfanumérico simple
  if (!/^[A-Z0-9][A-Z0-9._/-]{2,}$/i.test(numero)) {
    throw new SeguimientoError(
      "invalid_input",
      "El número de pedido no tiene un formato válido.",
      400,
    );
  }
}

export function parseTipoEnvio(raw: unknown): TipoEnvioConsulta {
  if (raw === "fasttrack" || raw === "smartpost" || raw === "auto") {
    return raw;
  }
  return "auto";
}

async function tryProvider(
  fn: (remito: string) => Promise<SeguimientoResultado>,
  remito: string,
): Promise<
  | { ok: true; data: SeguimientoResultado }
  | { ok: false; reason: "not_found" | "misconfigured" }
> {
  try {
    const data = await fn(remito);
    return { ok: true, data };
  } catch (err) {
    if (err instanceof SeguimientoError && err.code === "not_found") {
      return { ok: false, reason: "not_found" };
    }
    if (err instanceof SeguimientoError && err.code === "misconfigured") {
      return { ok: false, reason: "misconfigured" };
    }
    throw err;
  }
}

/**
 * Consulta seguimiento en ePresis según tipo:
 * - fasttrack / smartpost: un solo proveedor
 * - auto: FastTrack primero, luego SmartPost
 */
export async function consultarSeguimiento(opts: {
  numeroPedido: string;
  tipoEnvio?: TipoEnvioConsulta;
}): Promise<SeguimientoResultado> {
  const remito = normalizeNumeroPedido(opts.numeroPedido);
  validateNumeroPedido(remito);
  const tipo = opts.tipoEnvio ?? "auto";

  if (tipo === "fasttrack") {
    return consultarFasttrack(remito);
  }
  if (tipo === "smartpost") {
    return consultarSmartpost(remito);
  }

  const fromFt = await tryProvider(consultarFasttrack, remito);
  if (fromFt.ok) return fromFt.data;

  const fromSp = await tryProvider(consultarSmartpost, remito);
  if (fromSp.ok) return fromSp.data;

  if (
    fromFt.reason === "misconfigured" &&
    fromSp.reason === "misconfigured"
  ) {
    throw new SeguimientoError(
      "misconfigured",
      "El seguimiento de envíos no está configurado. Probá más tarde.",
      503,
    );
  }

  throw new SeguimientoError(
    "not_found",
    "No se encontró información para el número de pedido ingresado.",
    404,
  );
}
