"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { TiendaSeed } from "@/lib/tiendas-data";
import type { Map as LeafletMap, Marker } from "leaflet";

type Props = {
  tiendas: TiendaSeed[];
  activeSlug: string | null;
  onSelect: (slug: string) => void;
};

function buildPopup(t: TiendaSeed) {
  const wrap = document.createElement("div");
  wrap.className = "oc-tp";

  const img = document.createElement("img");
  img.src = t.imagen;
  img.alt = t.nombre_mapa;
  img.className = "oc-tp-img";
  wrap.appendChild(img);

  const titleBar = document.createElement("div");
  titleBar.className = "oc-tp-titlebar";

  const title = document.createElement("span");
  title.className = "oc-tp-title";
  title.textContent = t.nombre_mapa;
  titleBar.appendChild(title);

  const directions = document.createElement("a");
  directions.className = "oc-tp-directions";
  directions.href = `https://www.google.com/maps/dir/?api=1&destination=${t.latitud},${t.longitud}`;
  directions.target = "_blank";
  directions.rel = "noreferrer nofollow";
  directions.textContent = "Cómo llegar";
  titleBar.appendChild(directions);

  wrap.appendChild(titleBar);

  const body = document.createElement("div");
  body.className = "oc-tp-body";

  const address = document.createElement("p");
  address.className = "oc-tp-row";
  address.textContent = t.direccion_corta;
  body.appendChild(address);

  const email = document.createElement("p");
  email.className = "oc-tp-row";
  const emailLink = document.createElement("a");
  emailLink.href = `mailto:${t.email}`;
  emailLink.textContent = t.email;
  email.appendChild(emailLink);
  body.appendChild(email);

  const hr = document.createElement("hr");
  hr.className = "oc-tp-sep";
  body.appendChild(hr);

  const ventasTitle = document.createElement("p");
  ventasTitle.className = "oc-tp-hours-title";
  ventasTitle.textContent = "🛒 Ventas:";
  body.appendChild(ventasTitle);
  t.horario_ventas.forEach((line) => {
    const p = document.createElement("p");
    p.className = "oc-tp-hours-line";
    p.textContent = line;
    body.appendChild(p);
  });

  const servicioTitle = document.createElement("p");
  servicioTitle.className = "oc-tp-hours-title";
  servicioTitle.textContent = "⚙️ Servicio Técnico:";
  body.appendChild(servicioTitle);
  t.horario_servicio_tecnico.forEach((line) => {
    const p = document.createElement("p");
    p.className = "oc-tp-hours-line";
    p.textContent = line;
    body.appendChild(p);
  });

  wrap.appendChild(body);
  return wrap;
}

export default function TiendasMap({ tiendas, activeSlug, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Record<string, Marker>>({});

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: [-34.6, -60.5],
        zoom: 5,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        className: "oc-tiendas-pin",
        html: "<span></span>",
        iconSize: [22, 22],
        iconAnchor: [11, 22],
        popupAnchor: [0, -20],
      });

      const bounds = L.latLngBounds(
        tiendas.map((t) => [t.latitud, t.longitud])
      );

      tiendas.forEach((t) => {
        const marker = L.marker([t.latitud, t.longitud], { icon }).addTo(map);
        marker.bindPopup(buildPopup(t), {
          maxWidth: 280,
          className: "oc-tiendas-popup",
        });
        marker.on("click", () => onSelect(t.slug));
        markersRef.current[t.slug] = marker;
      });

      if (tiendas.length) map.fitBounds(bounds.pad(0.3));
      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeSlug) return;
    const marker = markersRef.current[activeSlug];
    const map = mapRef.current;
    if (!marker || !map) return;
    map.panTo(marker.getLatLng());
    marker.openPopup();
  }, [activeSlug]);

  return <div ref={containerRef} className="oc-tiendas-map-canvas" />;
}
