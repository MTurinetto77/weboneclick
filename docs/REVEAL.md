# Reveal — animación de entrada al scrollear

Componente **portable** de *scroll reveal*: revela su contenido cuando entra en pantalla.

**Archivo:** [`src/components/reveal.tsx`](../src/components/reveal.tsx)
**Usado en:** [`/producto/[slug]/preview`](../src/app/(shop)/producto/[slug]/preview/page.tsx)
**Última actualización:** 2026-08-19

---

## 1. Qué es

La animación se llama **scroll reveal** (también *reveal on scroll* o *entrance animation*): el elemento arranca invisible y desplazado, y cuando entra en el viewport se desliza a su posición final.

El componente es **autocontenido a propósito**:

- No importa ningún CSS. Todo va en estilos en línea.
- No tiene dependencias fuera de React.
- Es un solo archivo.

Eso significa que para llevarlo a otro proyecto alcanza con **copiar `src/components/reveal.tsx`**. Funciona en cualquier React 18+ / Next 13+ con App Router.

---

## 2. Uso

```tsx
import { Reveal, RevealGroup } from "@/components/reveal";

<Reveal>Aparece subiendo</Reveal>

<Reveal desde="izquierda">Entra desde la izquierda</Reveal>

<Reveal desde="desenfoque" duracion={900}>Enfoca al entrar</Reveal>

<Reveal desde="abajo" delay={120}>Escalonado a mano</Reveal>
```

Escalonado automático para grillas y listas:

```tsx
<RevealGroup paso={80} className="mi-grilla">
  {productos.map((p) => (
    <Card key={p.id} {...p} />
  ))}
</RevealGroup>
```

---

## 3. Props de `<Reveal>`

| Prop | Tipo | Default | Qué hace |
|------|------|---------|----------|
| `desde` | `RevealDireccion` | `"abajo"` | Desde dónde entra. Ver tabla siguiente |
| `delay` | `number` (ms) | `0` | Retardo, para encadenar varios elementos |
| `duracion` | `number` (ms) | `700` | Duración de la transición |
| `distancia` | `number` (px) | `28` | Cuánto se desplaza. Ignorado en `escala`, `desenfoque` y `ninguna` |
| `once` | `boolean` | `true` | Si es `false`, vuelve a animar cada vez que entra y sale de pantalla |
| `umbral` | `number` (0–1) | `0.15` | Porción del elemento que debe verse para disparar |
| `margen` | `string` | `"0px 0px -10% 0px"` | Margen del viewport, sintaxis de `IntersectionObserver` |
| `as` | `ElementType` | `"div"` | Etiqueta a renderizar. **Ver sección 6** |
| `className` | `string` | — | Se pasa tal cual al elemento |
| `style` | `CSSProperties` | — | Se mergea **después** de los estilos de animación |

### Valores de `desde`

| Valor | Efecto |
|-------|--------|
| `abajo` | Sube desde abajo (default) |
| `arriba` | Baja desde arriba |
| `izquierda` | Entra desde la izquierda |
| `derecha` | Entra desde la derecha |
| `escala` | Crece desde `scale(0.94)` |
| `desenfoque` | Enfoca desde `blur(10px)` |
| `ninguna` | Sólo fade, sin desplazamiento |

---

## 4. Props de `<RevealGroup>`

Acepta **todas** las props de `<Reveal>` salvo `delay` (lo calcula solo), más:

| Prop | Tipo | Default | Qué hace |
|------|------|---------|----------|
| `paso` | `number` (ms) | `70` | Milisegundos que se suman por cada hijo |
| `delayInicial` | `number` (ms) | `0` | Retardo del primer hijo |
| `delayMaximo` | `number` (ms) | `400` | Tope del retardo acumulado |

`delayMaximo` existe para que una lista de 40 ítems no termine animando el último a los 2,8 segundos.

---

## 5. Tres decisiones de implementación

### 5.1 `IntersectionObserver`, no `animation-timeline: view()`

La propiedad CSS nativa `animation-timeline: view()` haría esto sin JavaScript y sería más elegante, pero **todavía no está en Safari**. Para un e-commerce Apple eso es una parte enorme del tráfico, así que va por observer.

### 5.2 `prefers-reduced-motion` sin romper la hidratación

Cuando el visitante pide menos movimiento, la duración pasa a `0`: el contenido **aparece igual**, sin desplazamiento.

El detalle importante es *dónde* se lee la preferencia: **dentro del callback del observer**, no al inicializar el estado ni en el cuerpo del efecto.

```tsx
// ❌ Rompe la hidratación: el servidor no puede saber la preferencia del
//    visitante, así que renderiza un valor y el cliente otro.
const [quieto] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);

// ❌ El eslint-plugin-react-hooks de esta versión lo rechaza con
//    react-hooks/set-state-in-effect (encadena renders).
useEffect(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) setVisible(true);
}, []);

// ✅ Dentro del callback del observer.
const io = new IntersectionObserver((entradas) => {
  for (const e of entradas) {
    if (e.isIntersecting) {
      setQuieto(prefiereMenosMovimiento());
      setVisible(true);
    }
  }
});
```

### 5.3 Curva de animación

`cubic-bezier(0.16, 1, 0.3, 1)` — *ease-out expo*: arranca rápido y frena suave. Es la que hace que el movimiento se sienta "caro" en vez de mecánico.

---

## 6. Cuándo NO usar `RevealGroup`

`RevealGroup` envuelve **cada hijo en un elemento extra**. En un CSS grid eso importa: el wrapper pasa a ser el ítem de la grilla, no tu card, y se te rompen `grid-column`, `align-self`, etc.

Dos salidas:

1. **Usá `as`** para renderizar la etiqueta correcta y no romper el layout:

   ```tsx
   <ul>
     <RevealGroup as="div" /* wrapper del grupo */>
       {items.map((i) => <li key={i.id}>{i.nombre}</li>)}
     </RevealGroup>
   </ul>
   ```

   Ojo: acá el `as` del grupo es el contenedor. Para que **cada hijo** sea un `<li>`, usá `<Reveal as="li">` sueltos.

2. **Usá `<Reveal>` individuales con `delay` calculado.** Es lo que hace la grilla de configuraciones de la PDP:

   ```tsx
   {lineaCompleta.map((h, i) => (
     <Reveal key={h.idProducto} desde="abajo" delay={Math.min(240, 40 * i)}>
       <Link href={...} className="ocx-linea-card">…</Link>
     </Reveal>
   ))}
   ```

---

## 7. Código completo

Para copiar a otro proyecto, este es el archivo entero.

```tsx
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
  desde?: RevealDireccion;
  delay?: number;
  duracion?: number;
  distancia?: number;
  once?: boolean;
  umbral?: number;
  margen?: string;
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
  paso?: number;
  delayInicial?: number;
  delayMaximo?: number;
};

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
```

---

## 8. Checklist para llevarlo a otro proyecto

1. Copiar `src/components/reveal.tsx`.
2. Confirmar que el proyecto tiene React 18+ (necesita `"use client"` si es App Router de Next).
3. No hace falta CSS, ni configuración, ni instalar nada.
4. Si el proyecto usa alias distinto a `@/`, ajustar sólo el import en los lugares donde lo consumas.
