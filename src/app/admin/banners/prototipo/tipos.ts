/**
 * Modelo de datos del editor visual de banners (PROTOTIPO).
 *
 * Reparto de responsabilidades:
 *
 *   CONTENIDO (texto, href, src) → SIEMPRE compartido. Es "el mismo elemento":
 *   si cambiás el texto del botón, cambia en los dos dispositivos.
 *
 *   CARACTERÍSTICAS (posición, tamaño, color, tipografía, redondeo…) → se
 *   pueden independizar por dispositivo. `base` es el diseño compartido y
 *   `mobile` guarda SOLO las propiedades que el admin tocó estando en mobile.
 *   Lo que no está en `mobile` sigue heredando de `base`, así que si después
 *   cambiás un color en desktop, mobile lo sigue — salvo que lo hayas pisado.
 *
 * El diseño se exporta a HTML (ver html.ts) para que siga entrando en la
 * columna `banner.html` que ya usa la home.
 */

export type Dispositivo = "desktop" | "mobile";

export type TipoElemento =
  | "texto"
  | "boton"
  | "rect"
  | "circulo"
  | "linea"
  | "triangulo"
  | "imagen";

/** Todo lo que puede diferir entre desktop y mobile. */
export type PropsElemento = {
  /* --- posición y tamaño, en % del lienzo --- */
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  /** Ancho según el contenido (como un botón CSS real) en vez de % del lienzo. */
  wAuto: boolean;
  /** Alto según el contenido. Evita que el texto se deforme al cambiar de dispositivo. */
  hAuto: boolean;
  /* --- color --- */
  color: string;
  fondo: string;
  variante: "solido" | "contorno";
  /* --- tipografía --- */
  /** Tamaño de fuente en cqw (1cqw = 1% del ancho del banner) → fluido. */
  fs: number;
  /** Piso en px, para que en mobile no quede ilegible. */
  fsMin: number;
  peso: number;
  fuente: string;
  italica: boolean;
  mayusculas: boolean;
  /** Espaciado entre letras, en em. */
  espaciado: number;
  align: "left" | "center" | "right";
  /* --- forma --- */
  radio: number;
  /** Grosor en px de la línea. */
  grosor: number;
  opacidad: number;
  borde: number;
  bordeColor: string;
  sombra: boolean;
};

export type Elemento = {
  id: string;
  tipo: TipoElemento;
  z: number;
  /* --- contenido: siempre compartido --- */
  texto: string;
  href: string;
  src: string;
  /* --- características --- */
  base: PropsElemento;
  /** Solo las propiedades pisadas en mobile. null = hereda todo. */
  mobile: Partial<PropsElemento> | null;
};

export type EstadoBanner = {
  ubicacion: string;
  fondoDesktop: string;
  fondoMobile: string;
  elementos: Elemento[];
};

/** Las características efectivas para el dispositivo que se está editando. */
export function propsDe(el: Elemento, disp: Dispositivo): PropsElemento {
  if (disp === "mobile" && el.mobile) return { ...el.base, ...el.mobile };
  return el.base;
}

/** ¿Esta propiedad está pisada en mobile? */
export function esPropia(el: Elemento, k: keyof PropsElemento): boolean {
  return !!el.mobile && Object.prototype.hasOwnProperty.call(el.mobile, k);
}

export function cuentaPropias(el: Elemento): number {
  return el.mobile ? Object.keys(el.mobile).length : 0;
}

/**
 * Medidas REALES de cada ubicación, medidas sobre la home renderizada.
 *
 * El área de diseño es el banner COMPLETO: se puede poner un elemento pegado
 * a cualquier borde. En el hero eso requiere liberar `.oc-hero-live-grid`, que
 * por defecto encierra el contenido en 980px centrados — el HTML generado lo
 * ensancha con una regla acotada por :has() (ver html.ts).
 *
 * Contenedores: hero → .oc-hero-live-grid dentro de .oc-hero-live;
 * secundario → .oc-mundial-inner; triple → .oc-promo-card; pie → .oc-zagg-banner.
 */
export const MEDIDAS = [
  {
    value: "hero",
    label: "Hero",
    desktop: { w: 1600, h: 560 },
    mobile: { w: 390, h: 693 },
  },
  {
    value: "secundario",
    label: "Secundario",
    desktop: { w: 1480, h: 112 },
    mobile: { w: 366, h: 120 },
  },
  {
    value: "triple",
    label: "Triple (1 tarjeta)",
    desktop: { w: 429, h: 214 },
    mobile: { w: 358, h: 190 },
  },
  {
    value: "pie",
    label: "Pie",
    desktop: { w: 1320, h: 190 },
    mobile: { w: 358, h: 190 },
  },
] as const;

/** Familias con fallback: todas resuelven a algo instalado en Mac y Windows. */
export const FUENTES = [
  {
    // El fallback va DENTRO de var(): si la variable no existe, CSS invalida la
    // declaración entera y cae a serif en vez de a Arial.
    value: "var(--font-body, 'Helvetica Neue'), Arial, Helvetica, sans-serif",
    label: "Del sitio (SF Pro Display)",
  },
  { value: "'Helvetica Neue', Helvetica, Arial, sans-serif", label: "Helvetica" },
  { value: "Arial, Helvetica, sans-serif", label: "Arial" },
  { value: "'Trebuchet MS', 'Segoe UI', sans-serif", label: "Trebuchet" },
  { value: "Verdana, Geneva, sans-serif", label: "Verdana" },
  { value: "Tahoma, Geneva, sans-serif", label: "Tahoma" },
  { value: "Impact, Haettenschweiler, 'Arial Black', sans-serif", label: "Impact (títulos)" },
  { value: "Georgia, 'Times New Roman', serif", label: "Georgia (serif)" },
  { value: "'Times New Roman', Times, serif", label: "Times (serif)" },
  { value: "Palatino, 'Palatino Linotype', 'Book Antiqua', serif", label: "Palatino (serif)" },
  { value: "'Courier New', Courier, monospace", label: "Courier (mono)" },
  { value: "ui-monospace, SFMono-Regular, Menlo, monospace", label: "Monoespaciada" },
] as const;

/** Presets de redondeo para botones: la píldora ya viene incluida. */
export const FORMAS_BOTON = [
  { value: 999, label: "Píldora" },
  { value: 14, label: "Redondeado" },
  { value: 6, label: "Suave" },
  { value: 0, label: "Recto" },
] as const;

/** Nombre legible de cada propiedad, para avisar qué se independizó. */
export const NOMBRE_PROP: Partial<Record<keyof PropsElemento, string>> = {
  x: "posición X",
  y: "posición Y",
  w: "ancho",
  h: "alto",
  rot: "ángulo",
  wAuto: "ancho automático",
  hAuto: "alto automático",
  color: "color de texto",
  fondo: "color de relleno",
  variante: "estilo",
  fs: "tamaño de letra",
  fsMin: "piso de tamaño",
  peso: "peso",
  fuente: "tipografía",
  italica: "itálica",
  mayusculas: "mayúsculas",
  espaciado: "espaciado",
  align: "alineación",
  radio: "redondeo",
  grosor: "grosor",
  opacidad: "opacidad",
  borde: "borde",
  bordeColor: "color de borde",
  sombra: "sombra",
};

/** Selector del contenedor real de la home donde se inyecta cada banner. */
export const CONTENEDOR: Record<string, string> = {
  hero: ".oc-hero-live-grid",
  secundario: ".oc-mundial-inner",
  triple: ".oc-promo-card",
  pie: ".oc-zagg-banner",
};

export function medidasDe(ubicacion: string) {
  return MEDIDAS.find((m) => m.value === ubicacion) ?? MEDIDAS[0];
}

let contador = 0;
export function nuevoId() {
  contador += 1;
  return `e${Date.now().toString(36)}${contador}`;
}

const PROPS_BASE: PropsElemento = {
  x: 8,
  y: 20,
  w: 40,
  h: 20,
  rot: 0,
  wAuto: false,
  hAuto: false,
  color: "#ffffff",
  fondo: "#0071e3",
  variante: "solido",
  fs: 3,
  fsMin: 13,
  peso: 600,
  fuente: FUENTES[0].value,
  italica: false,
  mayusculas: false,
  espaciado: 0,
  align: "center",
  radio: 0,
  grosor: 3,
  opacidad: 1,
  borde: 0,
  bordeColor: "#111111",
  sombra: false,
};

export function nuevoElemento(tipo: TipoElemento, z: number): Elemento {
  const el: Elemento = {
    id: nuevoId(),
    tipo,
    z,
    texto: "",
    href: "",
    src: "",
    base: { ...PROPS_BASE },
    mobile: null,
  };

  switch (tipo) {
    case "texto":
      el.texto = "Escribí tu texto";
      el.base = { ...el.base, fondo: "transparent", fs: 4, hAuto: true, x: 8, y: 20, w: 45, h: 22 };
      break;
    case "boton":
      el.texto = "Comprar ahora";
      el.href = "/catalogo";
      el.base = { ...el.base, fs: 1.6, radio: 999, wAuto: true, hAuto: true, x: 8, y: 60, w: 20, h: 14 };
      break;
    case "circulo":
      el.base = { ...el.base, fondo: "#ff3b30", fs: 2, x: 70, y: 25, w: 16, h: 34 };
      break;
    case "linea":
      el.base = { ...el.base, fondo: "#ffffff", radio: 999, fs: 2, x: 8, y: 50, w: 30, h: 2 };
      break;
    case "triangulo":
      el.base = { ...el.base, fondo: "#ffcc00", fs: 2, x: 65, y: 25, w: 18, h: 35 };
      break;
    case "imagen":
      el.base = { ...el.base, fondo: "transparent", radio: 8, fs: 2, x: 60, y: 15, w: 30, h: 60 };
      break;
    case "rect":
    default:
      el.base = { ...el.base, fondo: "rgba(0,0,0,0.45)", radio: 12, fs: 2, x: 5, y: 12, w: 50, h: 70 };
      break;
  }
  return el;
}

/** Contenido de arranque, para que el prototipo se vea funcionando al abrirlo. */
export function estadoDemo(): EstadoBanner {
  const velo = nuevoElemento("rect", 1);
  velo.base = { ...velo.base, fondo: "rgba(0,0,0,0.55)", radio: 0, x: 0, y: 0, w: 62, h: 100 };

  const titulo = nuevoElemento("texto", 2);
  titulo.texto = "MacBook Air M4";
  titulo.base = { ...titulo.base, fs: 5.2, peso: 800, align: "left", x: 6, y: 20, w: 46, h: 20 };

  const bajada = nuevoElemento("texto", 3);
  bajada.texto = "Hasta 12 cuotas sin interés";
  bajada.base = { ...bajada.base, fs: 2.1, peso: 400, align: "left", color: "#d6d6d6", x: 6, y: 46, w: 44, h: 12 };

  const boton = nuevoElemento("boton", 4);
  boton.base = { ...boton.base, x: 6, y: 60, w: 18, h: 15 };

  return {
    ubicacion: "hero",
    fondoDesktop: "",
    fondoMobile: "",
    elementos: [velo, titulo, bajada, boton],
  };
}
