"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { buildShopHref, type ShopQuery } from "@/lib/shop-query";

type Props = {
  priceMin: number;
  priceMax: number;
  query: ShopQuery;
  basePath?: string;
};

function formatArsCompact(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Filtro de precio con doble deslizador (estilo WooCommerce / OneClick Store).
 */
export function ShopPriceSlider({ priceMin, priceMax, query, basePath = "/shop" }: Props) {
  const router = useRouter();
  const floor = Math.max(0, Math.floor(priceMin));
  const ceil = Math.max(floor + 1, Math.ceil(priceMax));

  const resolved = resolveRange(query, floor, ceil);
  const [minVal, setMinVal] = useState(resolved.min);
  const [maxVal, setMaxVal] = useState(resolved.max);

  useEffect(() => {
    const next = resolveRange(query, floor, ceil);
    setMinVal(next.min);
    setMaxVal(next.max);
  }, [query.min, query.max, floor, ceil]);

  const range = ceil - floor || 1;
  const leftPct = ((minVal - floor) / range) * 100;
  const rightPct = ((ceil - maxVal) / range) * 100;

  const trackStyle = useMemo(
    () => ({
      left: `${leftPct}%`,
      right: `${rightPct}%`,
    }),
    [leftPct, rightPct]
  );

  function apply() {
    const nextMin = minVal <= floor ? undefined : String(minVal);
    const nextMax = maxVal >= ceil ? undefined : String(maxVal);
    router.push(buildShopHref(query, { min: nextMin, max: nextMax }, basePath));
  }

  function clear() {
    setMinVal(floor);
    setMaxVal(ceil);
    router.push(buildShopHref(query, { min: undefined, max: undefined }, basePath));
  }

  const isFiltered = minVal > floor || maxVal < ceil;

  return (
    <section className="oc-shop-facet">
      <h3>Filtrar precios</h3>

      <div className="oc-shop-range">
        <div className="oc-shop-range-track" aria-hidden>
          <span className="oc-shop-range-fill" style={trackStyle} />
        </div>

        <input
          type="range"
          className="oc-shop-range-thumb oc-shop-range-thumb-min"
          min={floor}
          max={ceil}
          step={1}
          value={minVal}
          aria-label="Precio mínimo"
          onChange={(e) => {
            const next = Number(e.target.value);
            setMinVal(Math.min(next, maxVal));
          }}
        />
        <input
          type="range"
          className="oc-shop-range-thumb oc-shop-range-thumb-max"
          min={floor}
          max={ceil}
          step={1}
          value={maxVal}
          aria-label="Precio máximo"
          onChange={(e) => {
            const next = Number(e.target.value);
            setMaxVal(Math.max(next, minVal));
          }}
        />
      </div>

      <div className="oc-shop-range-labels">
        <span>{formatArsCompact(minVal)}</span>
        <span aria-hidden>—</span>
        <span>{formatArsCompact(maxVal)}</span>
      </div>

      <div className="oc-shop-range-actions">
        <button type="button" className="oc-btn oc-btn-dark oc-shop-price-btn" onClick={apply}>
          Filtrar
        </button>
        {isFiltered && (
          <button type="button" className="oc-shop-range-clear" onClick={clear}>
            Limpiar
          </button>
        )}
      </div>
    </section>
  );
}

function resolveRange(query: ShopQuery, floor: number, ceil: number) {
  const rawMin = query.min != null && query.min !== "" ? Number(query.min) : floor;
  const rawMax = query.max != null && query.max !== "" ? Number(query.max) : ceil;
  const min = clamp(Number.isFinite(rawMin) ? rawMin : floor, floor, ceil);
  const max = clamp(Number.isFinite(rawMax) ? rawMax : ceil, floor, ceil);
  return { min: Math.min(min, max), max: Math.max(min, max) };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
