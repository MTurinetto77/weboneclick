import { ONECLICK_TIENDAS } from "@/lib/tiendas-data";

export const metadata = { title: "Tiendas" };

export default function TiendasPage() {
  const tiendas = [...ONECLICK_TIENDAS].sort((a, b) => a.orden_mapa - b.orden_mapa);
  const mapQuery = encodeURIComponent("OneClick Store Apple Premium Reseller Argentina");

  return (
    <div className="oc-tiendas-page">
      <div className="oc-tiendas-layout">
        <aside className="oc-tiendas-list" aria-label="Listado de tiendas">
          {tiendas.map((t) => (
            <article key={t.slug} className="oc-tiendas-item">
              <div className="oc-tiendas-item-info">
                <h2>{t.nombre_mapa}</h2>
                <p>{t.direccion_corta}</p>
                <a href={`mailto:${t.email}`}>{t.email}</a>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.imagen} alt={t.nombre_mapa} className="oc-tiendas-item-img" />
            </article>
          ))}
        </aside>
        <div className="oc-tiendas-map">
          <iframe
            title="Mapa de tiendas OneClick"
            src={`https://maps.google.com/maps?q=${mapQuery}&z=5&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
