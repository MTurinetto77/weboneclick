import Link from "next/link";
import type { NeoColorOption, NeoStorageOption, NeoVariant } from "@/lib/macbook-neo";

type Props = {
  variants: NeoVariant[];
  colors: NeoColorOption[];
  storages: NeoStorageOption[];
  current: NeoVariant;
};

const COLOR_LABEL_ES: Record<string, string> = {
  Indigo: "Índigo",
  Silver: "Plateado",
  Yellow: "Amarillo",
  Pink: "Rosa",
};

function colorLabel(name: string): string {
  return COLOR_LABEL_ES[name] ?? name;
}

/**
 * Selector de color + almacenamiento estilo JBL/Apple. A diferencia del
 * prototipo original (que simulaba el cambio con estado de cliente), acá
 * cada combinación es un producto real con su propia página — así que
 * elegir un color/almacenamiento navega a la ficha real de esa variante
 * (misma lógica que un configurador, pero sin desincronizar galería,
 * descripción y specs del resto de la página).
 */
export function ProductNeoVariantSelector({ variants, colors, storages, current }: Props) {
  function findVariant(colorId: string, storageId: string) {
    return variants.find((v) => v.color === colorId && v.storage === storageId) ?? null;
  }

  return (
    <div className="oc-neo-variants">
      {colors.length > 1 && (
        <div className="oc-neo-colors">
          <p className="oc-neo-variant-label oc-neo-variant-label-row">
            <span>Color</span>
            <span className="oc-neo-variant-label-value">{colorLabel(current.color)}</span>
          </p>
          <div className="oc-neo-colors-row">
            {colors.map((c) => {
              const available = c.availableStorages.includes(current.storage);
              const target = available ? findVariant(c.id, current.storage) : null;
              const isSelected = c.id === current.color;
              if (!available || !target) {
                return (
                  <span
                    key={c.id}
                    className="oc-neo-swatch is-disabled"
                    title={`${colorLabel(c.name)} — no disponible en ${current.storageLabel}`}
                    aria-disabled
                  >
                    <span className="oc-neo-swatch-dot" style={{ backgroundColor: c.hex }} />
                    <span className="oc-neo-swatch-label">{colorLabel(c.name)}</span>
                  </span>
                );
              }
              return (
                <Link
                  key={c.id}
                  href={`/producto/${target.slug}`}
                  className={`oc-neo-swatch${isSelected ? " is-selected" : ""}`}
                  title={colorLabel(c.name)}
                  aria-current={isSelected}
                >
                  <span className="oc-neo-swatch-dot" style={{ backgroundColor: c.hex }} />
                  <span className="oc-neo-swatch-label">{colorLabel(c.name)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {storages.length > 1 && (
        <div className="oc-neo-storages">
          <p className="oc-neo-variant-label">Almacenamiento</p>
          <div className="oc-neo-storages-row">
            {storages.map((s) => {
              const colorAvailable = colors.find(
                (c) => c.id === current.color && c.availableStorages.includes(s.id)
              );
              const targetColorId = colorAvailable
                ? current.color
                : colors.find((c) => c.availableStorages.includes(s.id))?.id;
              const target = targetColorId ? findVariant(targetColorId, s.id) : null;
              const isSelected = s.id === current.storage;
              if (!target) return null;
              return (
                <Link
                  key={s.id}
                  href={`/producto/${target.slug}`}
                  className={`oc-neo-storage-btn${isSelected ? " is-selected" : ""}`}
                >
                  <span className="oc-neo-storage-btn-label">{s.label}</span>
                  <span className="oc-neo-storage-btn-touchid">
                    {target.touchId ? "Con Touch ID" : "Sin Touch ID"}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
