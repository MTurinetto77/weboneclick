export type {
  ProveedorSeguimiento,
  SeguimientoEvento,
  SeguimientoErrorCode,
  SeguimientoResultado,
  TipoEnvioConsulta,
} from "./types";
export { SeguimientoError } from "./types";
export {
  consultarSeguimiento,
  normalizeNumeroPedido,
  parseTipoEnvio,
  validateNumeroPedido,
} from "./seguimiento";
export { consultarFasttrack, consultarSmartpost } from "./epresis";
