"use client";

import { useState } from "react";
import type { TiendaSeed } from "@/lib/tiendas-data";
import TiendasMap from "@/components/tiendas-map";

export default function TiendasExplorer({ tiendas }: { tiendas: TiendaSeed[] }) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  return (
    <div className="oc-tiendas-layout">
      <aside className="oc-tiendas-list" aria-label="Listado de tiendas">
        {tiendas.map((t) => (
          <article
            key={t.slug}
            className={`oc-tiendas-item${activeSlug === t.slug ? " oc-tiendas-item--active" : ""}`}
            onClick={() => setActiveSlug(t.slug)}
          >
            <div className="oc-tiendas-item-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.imagen} alt={t.nombre_mapa} className="oc-tiendas-item-img" />
            </div>
            <div className="oc-tiendas-item-info">
              <div className="oc-tiendas-item-titlebar">
                <h2>{t.nombre_mapa}</h2>
                <a
                  className="oc-tiendas-item-directions"
                  href={`https://www.google.com/maps/dir/?api=1&destination=${t.latitud},${t.longitud}`}
                  target="_blank"
                  rel="noreferrer nofollow"
                  onClick={(e) => e.stopPropagation()}
                >
                  Cómo llegar
                </a>
              </div>
              <p className="oc-tiendas-item-address">{t.direccion_corta}</p>
              <a
                className="oc-tiendas-item-email"
                href={`mailto:${t.email}`}
                onClick={(e) => e.stopPropagation()}
              >
                {t.email}
              </a>
              <div className="oc-tiendas-item-hours">
                <p className="oc-tp-hours-title">🛒 Ventas:</p>
                {t.horario_ventas.map((line) => (
                  <p key={line} className="oc-tp-hours-line">
                    {line}
                  </p>
                ))}
                <p className="oc-tp-hours-title">⚙️ Servicio Técnico:</p>
                {t.horario_servicio_tecnico.map((line) => (
                  <p key={line} className="oc-tp-hours-line">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </article>
        ))}
      </aside>
      <div className="oc-tiendas-map">
        <TiendasMap tiendas={tiendas} activeSlug={activeSlug} onSelect={setActiveSlug} />
      </div>
    </div>
  );
}
