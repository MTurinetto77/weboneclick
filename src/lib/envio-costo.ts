import { prisma } from "@/lib/prisma";
import { getValorEnvioGratis } from "@/lib/parametros";

export type CpEnvioMatch = {
  proveedor: string;
  codigo_postal: string;
  localidad: string;
  dias_entrega: number;
  precio: number;
};

export type CostoEnvioResult = {
  ok: boolean;
  codigo_postal: string;
  costo: number;
  gratis: boolean;
  message: string;
  match: CpEnvioMatch | null;
};

function normalizeCp(raw: string): string {
  return String(raw || "")
    .trim()
    .replace(/\.0+$/, "")
    .replace(/\s+/g, "");
}

/** Busca el CP en codigo_postal_envio. Prefiere el menor precio > 0; si solo hay 0, usa ese. */
export async function findCodigoPostalEnvio(cpRaw: string): Promise<CpEnvioMatch | null> {
  const codigo_postal = normalizeCp(cpRaw);
  if (!codigo_postal) return null;

  const rows = await prisma.codigo_postal_envio.findMany({
    where: { codigo_postal },
    orderBy: { precio: "asc" },
  });
  if (!rows.length) {
    const asNum = Number(codigo_postal);
    if (Number.isFinite(asNum)) {
      const alt = await prisma.codigo_postal_envio.findMany({
        where: { codigo_postal: String(Math.trunc(asNum)) },
        orderBy: { precio: "asc" },
      });
      if (!alt.length) return null;
      return pickMatch(alt);
    }
    return null;
  }
  return pickMatch(rows);
}

function pickMatch(
  rows: {
    proveedor: string;
    codigo_postal: string;
    localidad: string;
    dias_entrega: number;
    precio: unknown;
  }[],
): CpEnvioMatch {
  const mapped = rows.map((r) => ({
    proveedor: r.proveedor,
    codigo_postal: r.codigo_postal,
    localidad: r.localidad,
    dias_entrega: r.dias_entrega,
    precio: Number(r.precio),
  }));
  const withPrice = mapped
    .filter((r) => r.precio > 0)
    .sort((a, b) => a.precio - b.precio);
  return withPrice[0] ?? mapped[0];
}

/**
 * Resuelve el costo de envío para un CP y subtotal de carrito.
 * Si el subtotal alcanza valor_para_envio_gratis → costo 0.
 */
export async function resolveCostoEnvio(opts: {
  codigo_postal: string;
  subtotal: number;
  valorEnvioGratis?: number;
}): Promise<CostoEnvioResult> {
  const codigo_postal = normalizeCp(opts.codigo_postal);
  if (!codigo_postal) {
    return {
      ok: false,
      codigo_postal: "",
      costo: 0,
      gratis: false,
      message: "Ingresá un código postal",
      match: null,
    };
  }

  const match = await findCodigoPostalEnvio(codigo_postal);
  if (!match) {
    return {
      ok: false,
      codigo_postal,
      costo: 0,
      gratis: false,
      message: "No hay envío disponible para este código postal",
      match: null,
    };
  }

  const umbral = opts.valorEnvioGratis ?? (await getValorEnvioGratis());
  const gratis = opts.subtotal >= umbral;
  const costo = gratis ? 0 : match.precio;

  return {
    ok: true,
    codigo_postal: match.codigo_postal,
    costo,
    gratis,
    message: gratis
      ? "Envío gratis"
      : costo > 0
        ? `Envío: $${costo.toLocaleString("es-AR", { minimumFractionDigits: 2 })} (${match.proveedor}, ${match.dias_entrega} día${match.dias_entrega === 1 ? "" : "s"})`
        : "",
    match,
  };
}
