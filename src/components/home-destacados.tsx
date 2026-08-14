"use client";

import { useState } from "react";
import { ProductCard } from "@/components/product-card";
import type { ProductListItem } from "@/lib/products";
import {
  DESTACADOS_PESTANAS,
  type DestacadosPestana,
} from "@/lib/secciones-constants";

export function HomeDestacados({
  title,
  products,
  descuentoContado = null,
}: {
  title: string;
  products: Record<DestacadosPestana, ProductListItem[]>;
  descuentoContado?: { umbralCuotas: number; porcentaje: number } | null;
}) {
  const [tab, setTab] = useState<DestacadosPestana>("apple");
  const items = products[tab];

  return (
    <section className="oc-section oc-destacados">
      <div className="container">
        <div className="oc-destacados-head">
          <h2>{title}</h2>
          <div className="oc-seg" role="tablist" aria-label="Categorías destacadas">
            {DESTACADOS_PESTANAS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`oc-seg-item${active ? " is-active" : ""}`}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="oc-product-grid oc-product-scroll" role="tabpanel">
          {items.map((p) => (
            <ProductCard
              key={p.id_producto}
              product={p}
              descuentoContado={descuentoContado}
            />
          ))}
        </div>
        {!items.length && (
          <p className="muted">Todavía no hay productos en esta selección.</p>
        )}
      </div>
    </section>
  );
}
