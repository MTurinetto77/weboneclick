"use client";

import { useState } from "react";
import { ProductCard } from "@/components/product-card";
import type { ProductListItem } from "@/lib/products";

export type DestacadosTab = "apple" | "jbl" | "accesorios";

const TABS: { id: DestacadosTab; label: string }[] = [
  { id: "apple", label: "Apple" },
  { id: "jbl", label: "JBL" },
  { id: "accesorios", label: "Accesorios" },
];

export function HomeDestacados({
  products,
}: {
  products: Record<DestacadosTab, ProductListItem[]>;
}) {
  const [tab, setTab] = useState<DestacadosTab>("apple");
  const items = products[tab];

  return (
    <section className="oc-section oc-destacados">
      <div className="container">
        <div className="oc-destacados-head">
          <h2>Destacados</h2>
          <div className="oc-seg" role="tablist" aria-label="Categorías destacadas">
            {TABS.map((t) => {
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
            <ProductCard key={p.id_producto} product={p} />
          ))}
        </div>
        {!items.length && (
          <p className="muted">Todavía no hay productos en esta selección.</p>
        )}
      </div>
    </section>
  );
}
