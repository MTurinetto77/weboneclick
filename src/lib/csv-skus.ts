/** Extrae SKUs de un CSV: una columna `sku`, o una fila/celda por SKU. */
export function parseSkusFromCsv(text: string): string[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const skus: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const cells = lines[i]
      .split(/[,;\t]/)
      .map((c) => c.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
    if (!cells.length) continue;
    // Saltar encabezado
    if (i === 0 && cells.length === 1 && /^sku$/i.test(cells[0])) continue;
    if (i === 0 && cells.length > 1) {
      const skuIdx = cells.findIndex((c) => /^sku$/i.test(c));
      if (skuIdx >= 0) {
        // Header multi-columna: tomar solo la columna sku en el resto
        for (let j = 1; j < lines.length; j++) {
          const row = lines[j]
            .split(/[,;\t]/)
            .map((c) => c.trim().replace(/^["']|["']$/g, ""));
          const v = row[skuIdx]?.trim();
          if (v) skus.push(v);
        }
        return [...new Set(skus)];
      }
    }
    // Una o más celdas por fila = SKUs
    for (const c of cells) skus.push(c);
  }
  return [...new Set(skus)];
}
