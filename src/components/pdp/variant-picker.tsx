import Link from "next/link";
import { formatPriceArs } from "@/lib/pricing";
import type { OpcionEje } from "@/lib/product-variants";

type Props = {
  /** Título del eje: "Color", "Almacenamiento", … */
  titulo: string;
  /** Valor elegido hoy, para marcar el activo. */
  seleccion: string | null;
  opciones: OpcionEje[];
  /** Los colores se muestran como muestras circulares. */
  variante?: "swatch" | "pastilla";
  /** Ruta base a la que apuntan los links. */
  hrefDe: (slug: string) => string;
};

/**
 * Selector de un eje de variante. Cada opción es un link al SKU hermano, así
 * que funciona sin JavaScript y cada configuración conserva su propia URL.
 * Las combinaciones que no existen en el catálogo se muestran deshabilitadas
 * en vez de desaparecer, para que se vea qué ofrece la línea completa.
 */
export function VariantPicker({
  titulo,
  seleccion,
  opciones,
  variante = "pastilla",
  hrefDe,
}: Props) {
  if (opciones.length < 2) return null;

  const activo = opciones.find((o) => o.valor === seleccion);

  return (
    <div className="ocx-picker">
      <div className="ocx-picker-head">
        <span className="ocx-picker-title">{titulo}</span>
        {activo && <span className="ocx-picker-value">{activo.label}</span>}
      </div>

      <div className={`ocx-picker-opts ocx-picker-${variante}`}>
        {opciones.map((o) => {
          const esActivo = o.valor === seleccion;
          const clases = [
            variante === "swatch" ? "ocx-swatch" : "ocx-pill",
            esActivo ? "is-active" : "",
            !o.disponible ? "is-off" : "",
            o.agotado ? "is-oos" : "",
          ]
            .filter(Boolean)
            .join(" ");

          const contenido =
            variante === "swatch" ? (
              <>
                <span
                  className="ocx-swatch-dot"
                  style={{
                    background: `linear-gradient(145deg, ${o.hexSoft ?? o.hex} 0%, ${o.hex} 62%)`,
                  }}
                />
                <span className="ocx-swatch-label">{o.label}</span>
              </>
            ) : (
              <>
                <span className="ocx-pill-label">{o.label}</span>
                {o.delta != null && o.delta !== 0 && (
                  <span className="ocx-pill-delta">
                    {o.delta > 0 ? "+" : "−"}
                    {formatPriceArs(Math.abs(o.delta))}
                  </span>
                )}
                {o.agotado && <span className="ocx-pill-oos">Sin stock</span>}
              </>
            );

          if (!o.disponible || !o.slug || esActivo) {
            return (
              <span
                key={o.valor}
                className={clases}
                aria-current={esActivo ? "true" : undefined}
                aria-disabled={!o.disponible ? "true" : undefined}
                title={!o.disponible ? "No disponible en esta configuración" : undefined}
              >
                {contenido}
              </span>
            );
          }

          return (
            <Link key={o.valor} href={hrefDe(o.slug)} className={clases} scroll={false}>
              {contenido}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
