"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";

/**
 * Reveal — animación de entrada al scrollear ("scroll reveal").
 *
 * Autocontenido a propósito: no importa CSS ni librerías, así que se copia
 * este único archivo a cualquier proyecto React 18+ / Next 13+ y funciona.
 *
 *   <Reveal>                          … aparece subiendo
 *   <Reveal desde="izquierda">        … entra desde la izquierda
 *   <Reveal delay={120}>              … escalonado manual
 *   <RevealGroup paso={80}>…</…>      … escalona a sus hijos solo
 *
 * Notas de implementación:
 * - Usa IntersectionObserver en vez de `animation-timeline: view()` porque esa
 *   propiedad todavía no está en Safari.
 * - `prefers-reduced-motion` se respeta poniendo la duración en 0: el contenido
 *   aparece igual, sin desplazamiento. Se resuelve dentro del callback del
 *   observer y no en el cuerpo del efecto, para no encadenar renders ni romper
 *   la hidratación (el servidor no puede saber la preferencia del visitante).
 */

export type RevealDireccion =
  | "abajo"
  | "arriba"
  | "izquierda"
  | "derecha"
  | "escala"
  | "desenfoque"
  | "ninguna";

export type RevealProps = {
  children: ReactNode;
  /** Desde dónde entra. Por defecto sube desde abajo. */
  desde?: RevealDireccion;
  /** Retardo en ms, para encadenar varios elementos. */
  delay?: number;
  /** Duración en ms. */
  duracion?: number;
  /** Cuántos px se desplaza. Ignorado en "escala"/"desenfoque"/"ninguna". */
  distancia?: number;
  /** Si false, vuelve a animar cada vez que entra y sale de pantalla. */
  once?: boolean;
  /** Porción del elemento que debe verse para disparar (0 a 1). */
  umbral?: number;
  /** Margen del viewport, sintaxis de IntersectionObserver. */
  margen?: string;
  /** Etiqueta a renderizar. Útil para no romper grids/listas: as="li". */
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
};

const SALIDA: Record<RevealDireccion, (d: number) => CSSProperties> = {
  abajo: (d) => ({ transform: `translate3d(0, ${d}px, 0)` }),
  arriba: (d) => ({ transform: `translate3d(0, -${d}px, 0)` }),
  izquierda: (d) => ({ transform: `translate3d(-${d}px, 0, 0)` }),
  derecha: (d) => ({ transform: `translate3d(${d}px, 0, 0)` }),
  escala: () => ({ transform: "scale(0.94)" }),
  desenfoque: () => ({ filter: "blur(10px)", transform: "scale(1.02)" }),
  ninguna: () => ({}),
};

/** Curva "ease-out expo": arranca rápido y frena suave. */
const CURVA = "cubic-bezier(0.16, 1, 0.3, 1)";

function prefiereMenosMovimiento(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function Reveal({
  children,
  desde = "abajo",
  delay = 0,
  duracion = 700,
  distancia = 28,
  once = true,
  umbral = 0.15,
  margen = "0px 0px -10% 0px",
  as: Etiqueta = "div",
  className,
  style,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [quieto, setQuieto] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) {
            setQuieto(prefiereMenosMovimiento());
            setVisible(true);
            if (once) io.disconnect();
          } else if (!once) {
            setVisible(false);
          }
        }
      },
      { threshold: umbral, rootMargin: margen }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [once, umbral, margen]);

  const ms = quieto ? 0 : duracion;

  const estilo: CSSProperties = {
    opacity: visible ? 1 : 0,
    transition: `opacity ${ms}ms ${CURVA}, transform ${ms}ms ${CURVA}, filter ${ms}ms ${CURVA}`,
    transitionDelay: quieto ? "0ms" : `${delay}ms`,
    willChange: visible ? undefined : "opacity, transform",
    ...(visible ? { transform: "none", filter: "none" } : SALIDA[desde](distancia)),
    ...style,
  };

  return (
    <Etiqueta ref={ref} className={className} style={estilo}>
      {children}
    </Etiqueta>
  );
}

export type RevealGroupProps = Omit<RevealProps, "delay"> & {
  /** Milisegundos que se suman por cada hijo. */
  paso?: number;
  /** Retardo del primer hijo. */
  delayInicial?: number;
  /** Tope, para que una lista larga no termine animando a los 4 segundos. */
  delayMaximo?: number;
};

/**
 * Envuelve cada hijo en un <Reveal> con retardo creciente. Sirve para grillas
 * de tarjetas o listas de datos sin tener que calcular el delay a mano.
 */
export function RevealGroup({
  children,
  paso = 70,
  delayInicial = 0,
  delayMaximo = 400,
  as: Etiqueta = "div",
  className,
  style,
  ...resto
}: RevealGroupProps) {
  return (
    <Etiqueta className={className} style={style}>
      {Children.toArray(children)
        .filter(isValidElement)
        .map((hijo, i) => (
          <Reveal
            key={hijo.key ?? i}
            delay={Math.min(delayMaximo, delayInicial + i * paso)}
            {...resto}
          >
            {hijo}
          </Reveal>
        ))}
    </Etiqueta>
  );
}
