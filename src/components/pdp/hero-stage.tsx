"use client";

import { useEffect, useRef, useState } from "react";
import { uploadPublicUrl } from "@/lib/utils";
import type { Shot } from "@/lib/product-story";

type Props = {
  shots: Shot[];
  /** Columna de compra, renderizada en el servidor. */
  children: React.ReactNode;
};

/**
 * Hero del PDP: la imagen queda fija (sticky) mientras la columna de compra
 * scrollea al lado, y va cambiando de toma según el avance del scroll.
 * En mobile el sticky se desactiva y las tomas pasan a un carrusel horizontal.
 */
export function HeroStage({ shots, children }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || shots.length < 2) return;
    // En mobile no hay sticky: la galería es un carrusel y manda el usuario.
    const mq = window.matchMedia("(max-width: 900px)");
    let frame = 0;

    const medir = () => {
      frame = 0;
      if (mq.matches) return;
      const r = el.getBoundingClientRect();
      // Avance del bloque respecto de la ventana, de 0 (recién entra) a 1.
      const recorrido = r.height - window.innerHeight;
      if (recorrido <= 0) return;
      const avance = Math.min(1, Math.max(0, -r.top / recorrido));
      const siguiente = Math.min(shots.length - 1, Math.floor(avance * shots.length));
      setIndex((prev) => (prev === siguiente ? prev : siguiente));
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(medir);
    };

    medir();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [shots.length]);

  return (
    <div className="ocx-stage" ref={stageRef}>
      <div className="ocx-stage-media">
        <div className="ocx-stage-frame">
          {shots.map((shot, i) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={shot.src}
              className={`ocx-stage-img${i === index ? " is-active" : ""}`}
              src={uploadPublicUrl(shot.src)}
              alt={shot.alt}
              style={{ objectFit: shot.encuadre ?? "contain", objectPosition: shot.foco ?? "center" }}
              loading={i === 0 ? "eager" : "lazy"}
              draggable={false}
            />
          ))}
        </div>

        {shots.length > 1 && (
          <div className="ocx-stage-dots" role="presentation">
            {shots.map((shot, i) => (
              <span key={shot.src} className={`ocx-dot${i === index ? " is-active" : ""}`} />
            ))}
          </div>
        )}

        {/* Carrusel: sólo se ve en mobile, donde el sticky está desactivado. */}
        <div className="ocx-stage-rail">
          {shots.map((shot) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={shot.src}
              className="ocx-rail-img"
              src={uploadPublicUrl(shot.src)}
              alt={shot.alt}
              loading="lazy"
              draggable={false}
            />
          ))}
        </div>
      </div>

      <div className="ocx-stage-buy">{children}</div>
    </div>
  );
}
