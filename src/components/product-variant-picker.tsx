import Link from "next/link";
import { sortColors, type ProductVariantOption } from "@/lib/products";

const COLOR_SWATCH: Record<string, string> = {
  "Negro Espacial": "#3a3a3d",
  "Plata": "#e3e4e6",
  "Plateado": "#e3e4e6",
  "Space Black": "#3a3a3d",
  "Gris Espacial": "#6e6e73",
  "Dorado": "#f0e1c6",
  "Amarillo": "#f4d94e",
  "Rosa": "#f2c3d0",
  "Índigo": "#4b5488",
};

function swatchHex(color: string): string {
  return COLOR_SWATCH[color] ?? "#d2d2d7";
}

/** Dentro de un pool de variantes, busca la que mejor matchea los ejes pedidos
 *  (probando primero todos juntos, después de a uno, hasta quedarse con lo que haya). */
function resolveInPool(
  pool: ProductVariantOption[],
  want: { chip?: string | null; memoria?: string | null; teclado?: string | null }
): ProductVariantOption {
  const keys = (Object.keys(want) as (keyof typeof want)[]).filter((k) => want[k] != null);
  for (let n = keys.length; n > 0; n--) {
    const subset = keys.slice(0, n);
    const match = pool.find((v) => subset.every((k) => v[k] === want[k]));
    if (match) return match;
  }
  return pool[0];
}

export function ProductVariantPicker({
  variants,
  currentId,
}: {
  variants: ProductVariantOption[];
  currentId: number;
}) {
  const current = variants.find((v) => v.id_producto === currentId);
  if (!current) return null;

  const colors = sortColors([
    ...new Set(variants.map((v) => v.color).filter((c): c is string => Boolean(c))),
  ]);
  const chips = [...new Set(variants.map((v) => v.chip).filter((c): c is string => Boolean(c)))];
  // Memoria y Teclado se listan sobre el total de variantes (no solo el pool del
  // color actual): así el selector muestra siempre las mismas opciones sin
  // importar qué color esté elegido, marcando como no disponibles ("is-oos")
  // las combinaciones que no existen para el color/memoria actualmente elegidos.
  const memoriaOptions = [
    ...new Set(variants.map((v) => v.memoria).filter((m): m is string => Boolean(m))),
  ];
  const tecladoOptions = [
    ...new Set(variants.map((v) => v.teclado).filter((t): t is string => Boolean(t))),
  ];

  return (
    <div className="oc-pdp-variants">
      {colors.length > 1 && (
        <div className="oc-pdp-variant-group">
          <div className="oc-pdp-variant-heading">
            <span>Color</span>
            {current.color && <em>{current.color}</em>}
          </div>
          <div className="oc-pdp-variant-options">
            {colors.map((color) => {
              const pool = variants.filter((v) => v.color === color);
              const target = resolveInPool(pool, {
                chip: current.chip,
                memoria: current.memoria,
                teclado: current.teclado,
              });
              const active = color === current.color;
              return (
                <Link
                  key={color}
                  href={`/producto/${target.slug}`}
                  scroll={false}
                  className={`oc-pdp-variant-swatch${active ? " is-active" : ""}${
                    !target.inStock ? " is-oos" : ""
                  }`}
                  aria-current={active}
                >
                  <span className="oc-pdp-variant-dot" style={{ background: swatchHex(color) }} />
                  {color}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {chips.length > 1 && (
        <div className="oc-pdp-variant-group">
          <div className="oc-pdp-variant-heading">
            <span>Chip</span>
            {current.chip && <em>{current.chip}</em>}
          </div>
          <div className="oc-pdp-variant-options">
            {chips.map((chip) => {
              const sameColorPool = variants.filter((v) => v.color === current.color && v.chip === chip);
              const availableForColor = sameColorPool.length > 0;
              const pool = availableForColor ? sameColorPool : variants.filter((v) => v.chip === chip);
              const target = resolveInPool(pool, {
                memoria: current.memoria,
                teclado: current.teclado,
              });
              const active = chip === current.chip;
              const chipSpec = variants.find((v) => v.chip === chip)?.chipSpec;
              return (
                <Link
                  key={chip}
                  href={`/producto/${target.slug}`}
                  scroll={false}
                  className={`oc-pdp-variant-chip${active ? " is-active" : ""}${
                    !target.inStock || !availableForColor ? " is-oos" : ""
                  }`}
                  aria-current={active}
                >
                  <span className="oc-pdp-variant-chip-n">Chip {chip}</span>
                  {chipSpec && <span className="oc-pdp-variant-chip-m">{chipSpec}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {memoriaOptions.length > 1 && (
        <div className="oc-pdp-variant-group">
          <div className="oc-pdp-variant-heading">
            <span>Memoria y almacenamiento</span>
            {current.memoria && <em>{current.memoria}</em>}
          </div>
          <div className="oc-pdp-variant-options">
            {memoriaOptions.map((memoria) => {
              const sameContextPool = variants.filter(
                (v) => v.color === current.color && v.chip === current.chip && v.memoria === memoria
              );
              const availableForColor = sameContextPool.length > 0;
              const pool = availableForColor
                ? sameContextPool
                : variants.filter((v) => v.memoria === memoria);
              const target = resolveInPool(pool, { chip: current.chip, teclado: current.teclado });
              const active = memoria === current.memoria;
              return (
                <Link
                  key={memoria}
                  href={`/producto/${target.slug}`}
                  scroll={false}
                  className={`oc-pdp-variant-pill${active ? " is-active" : ""}${
                    !target.inStock || !availableForColor ? " is-oos" : ""
                  }`}
                  aria-current={active}
                >
                  {memoria}
                  {target.touchId && <span className="oc-pdp-variant-pill-touchid">Con Touch ID</span>}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {tecladoOptions.length > 1 && (
        <div className="oc-pdp-variant-group">
          <div className="oc-pdp-variant-heading">
            <span>Teclado</span>
            {current.teclado && <em>{current.teclado}</em>}
          </div>
          <div className="oc-pdp-variant-options">
            {tecladoOptions.map((teclado) => {
              const sameSelectionPool = variants.filter(
                (v) =>
                  v.color === current.color &&
                  v.chip === current.chip &&
                  v.memoria === current.memoria &&
                  v.teclado === teclado
              );
              const availableForSelection = sameSelectionPool.length > 0;
              const pool = availableForSelection
                ? sameSelectionPool
                : variants.filter((v) => v.teclado === teclado);
              const target = pool[0];
              const active = teclado === current.teclado;
              return (
                <Link
                  key={teclado}
                  href={`/producto/${target.slug}`}
                  scroll={false}
                  className={`oc-pdp-variant-pill${active ? " is-active" : ""}${
                    !target.inStock || !availableForSelection ? " is-oos" : ""
                  }`}
                  aria-current={active}
                >
                  {teclado}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
