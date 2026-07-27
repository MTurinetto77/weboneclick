import * as XLSX from "xlsx";

export type ProveedorEnvio = "fastrack" | "smartpost";

export type CpEnvioRow = {
  proveedor: ProveedorEnvio;
  codigo_postal: string;
  localidad: string;
  dias_entrega: number;
  precio: number;
  zona?: number | null;
};

function normalizeCp(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim();
  if (!s) return null;
  const asNum = Number(s);
  if (Number.isFinite(asNum) && String(asNum) === s.replace(/\.0+$/, "")) {
    return String(Math.trunc(asNum));
  }
  return s.replace(/\.0+$/, "");
}

function cellStr(raw: unknown): string {
  if (raw == null) return "";
  return String(raw).trim();
}

function cellNum(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const n = Number(String(raw).trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Parsea lista "1,2,3" o "1; 2; 3" → set de zonas numéricas. */
export function parseZonasExcluir(raw: string, fallback: number[] = [1]): Set<number> {
  const parts = String(raw || "")
    .split(/[,;|\s]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return new Set(fallback);
  const zones = parts
    .map((p) => Number(p.replace(/^zona/i, "")))
    .filter((n) => Number.isFinite(n));
  return new Set(zones.length ? zones : fallback);
}

function readWorkbook(buffer: Buffer): XLSX.WorkBook {
  return XLSX.read(buffer, { type: "buffer" });
}

/**
 * Fast track.xlsx — hoja "Zonas STD"
 * Headers: cp | localidad | provincia | tiempo_entrega | Dias | zona
 * Precio por zona desde parámetros fastrack_precio_zona_N.
 * Se excluyen zonas indicadas (por defecto zona 1).
 */
export function parseFastrackWorkbook(
  buffer: Buffer,
  opts: {
    zonasExcluir: Set<number>;
    preciosPorZona: Record<number, number>;
  },
): CpEnvioRow[] {
  const wb = readWorkbook(buffer);
  const sheetName = wb.SheetNames.find((n) => /zona/i.test(n)) ?? wb.SheetNames[0];
  if (!sheetName) throw new Error("El Excel de FastTrack no tiene hojas");
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(wb.Sheets[sheetName], {
    header: 1,
    defval: null,
  });

  let headerIdx = -1;
  let colCp = -1;
  let colLocalidad = -1;
  let colDias = -1;
  let colZona = -1;

  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i] ?? [];
    const labels = row.map((c) => cellStr(c).toLowerCase());
    const iCp = labels.findIndex((l) => l === "cp" || l === "codigo_postal" || l === "código postal");
    if (iCp < 0) continue;
    headerIdx = i;
    colCp = iCp;
    colLocalidad = labels.findIndex((l) => l === "localidad");
    colDias = labels.findIndex((l) => l === "dias" || l === "días" || l === "dias_entrega");
    colZona = labels.findIndex((l) => l === "zona");
    break;
  }

  if (headerIdx < 0 || colCp < 0) {
    throw new Error("No se encontró la columna cp en el Excel de FastTrack");
  }
  if (colLocalidad < 0) colLocalidad = colCp + 1;
  if (colDias < 0) colDias = colCp + 4;
  if (colZona < 0) colZona = colCp + 5;

  const out: CpEnvioRow[] = [];
  const seen = new Set<string>();

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const cp = normalizeCp(row[colCp]);
    if (!cp) continue;

    const zona = cellNum(row[colZona]);
    if (zona != null && opts.zonasExcluir.has(zona)) continue;

    const localidad = cellStr(row[colLocalidad]) || "—";
    const dias = cellNum(row[colDias]);
    const dias_entrega = dias != null && dias > 0 ? Math.round(dias) : 1;

    const zonaKey = zona != null ? Math.round(zona) : null;
    const precio =
      zonaKey != null && opts.preciosPorZona[zonaKey] != null
        ? opts.preciosPorZona[zonaKey]
        : 0;

    if (seen.has(cp)) continue;
    seen.add(cp);

    out.push({
      proveedor: "fastrack",
      codigo_postal: cp,
      localidad,
      dias_entrega,
      precio,
      zona: zonaKey,
    });
  }

  return out;
}

/**
 * SmartPost.xlsx — hoja "CP"
 * Headers: cp | localidad | ... | Costo
 * Precio se toma de la columna Costo. Días default 1 (no viene en el archivo).
 */
export function parseSmartpostWorkbook(
  buffer: Buffer,
  opts?: { diasEntrega?: number },
): CpEnvioRow[] {
  const diasEntrega =
    opts?.diasEntrega != null && opts.diasEntrega > 0 ? Math.round(opts.diasEntrega) : 1;

  const wb = readWorkbook(buffer);
  const sheetName = wb.SheetNames.find((n) => /^cp$/i.test(n)) ?? wb.SheetNames[0];
  if (!sheetName) throw new Error("El Excel de SmartPost no tiene hojas");

  const objs = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], {
    defval: null,
  });

  const out: CpEnvioRow[] = [];
  const seen = new Set<string>();

  for (const obj of objs) {
    const keys = Object.keys(obj);
    const cpKey = keys.find((k) => k.trim().toLowerCase() === "cp") ?? "cp";
    const locKey =
      keys.find((k) => k.trim().toLowerCase() === "localidad") ?? "localidad";
    const costoKey =
      keys.find((k) => {
        const n = k.trim().toLowerCase();
        return n === "costo" || n === "precio" || n === "costo ";
      }) ?? keys.find((k) => /costo|precio/i.test(k.trim()));

    const cp = normalizeCp(obj[cpKey]);
    if (!cp) continue;
    if (seen.has(cp)) continue;
    seen.add(cp);

    const precio = costoKey ? cellNum(obj[costoKey]) : null;

    out.push({
      proveedor: "smartpost",
      codigo_postal: cp,
      localidad: cellStr(obj[locKey]) || "—",
      dias_entrega: diasEntrega,
      precio: precio != null && precio >= 0 ? precio : 0,
      zona: null,
    });
  }

  return out;
}
