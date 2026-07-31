export type TipoEnvioConsulta = "auto" | "fasttrack" | "smartpost";

export type ProveedorSeguimiento = "fasttrack" | "smartpost";

export type SeguimientoEvento = {
  fecha: string;
  estado: string;
  detalle?: string;
};

export type SeguimientoResultado = {
  proveedor: ProveedorSeguimiento;
  tipoLabel: string;
  estadoActual: string;
  nroGuia?: string;
  remito?: string;
  receptor?: string;
  eventos: SeguimientoEvento[];
};

export type SeguimientoErrorCode =
  | "not_found"
  | "unauthenticated"
  | "misconfigured"
  | "provider_error"
  | "invalid_input";

export class SeguimientoError extends Error {
  readonly code: SeguimientoErrorCode;
  readonly status: number;

  constructor(code: SeguimientoErrorCode, message: string, status = 400) {
    super(message);
    this.name = "SeguimientoError";
    this.code = code;
    this.status = status;
  }
}
