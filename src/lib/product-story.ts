/**
 * Guion visual del PDP nuevo (mock de presentación).
 *
 * Todo el contenido de esta pantalla sale de acá: no hay tablas nuevas ni
 * columnas nuevas. Las imágenes son las que ya están sincronizadas desde Odoo
 * en `uploads/productos/...`, sólo que acá se las agrupa por lo que muestran
 * (tapa, teclado, perfil, chip, pantalla) en vez de por SKU, que es como vienen.
 *
 * Para sumar otra familia alcanza con agregar una entrada a STORIES.
 */

/** Una toma concreta del producto, con su recorte y su relación de aspecto. */
export type Shot = {
  src: string;
  alt: string;
  /** Cuánto recortar/ampliar la foto dentro de su marco. */
  encuadre?: "contain" | "cover";
  /** Punto focal cuando `encuadre` es "cover". */
  foco?: string;
};

export type Banda = {
  id: string;
  /** Antetítulo corto en mayúsculas. */
  kicker: string;
  titulo: string;
  copy: string;
  /** Datos duros que aparecen debajo del texto. */
  datos?: { valor: string; label: string }[];
  /** Cómo se compone la banda. */
  layout: "figura-derecha" | "figura-izquierda" | "figura-completa" | "duo";
  /** Fondo claro (por defecto) u oscuro para cortar el ritmo. */
  tono?: "claro" | "oscuro" | "color";
  shots: Shot[];
};

type ColorKey = "medianoche" | "blanco-estelar" | "azul-cielo" | "plata";

const U = (p: string) => p;

/** Tapa cerrada/abierta de frente, por color y tamaño. */
const HERO: Record<string, Partial<Record<ColorKey, string>>> = {
  "13": {
    medianoche: U("productos/56092/f56e397ab8.jpg"),
    "blanco-estelar": U("productos/56391/808e8729a5.jpg"),
    "azul-cielo": U("productos/56443/5f71d463fb.jpg"),
    plata: U("productos/58198/23f182ecd0.jpg"),
  },
  "15": {
    medianoche: U("productos/56097/868dfdbe5d.jpg"),
    "blanco-estelar": U("productos/55262/ede86fca29.jpg"),
  },
};

/** Vista cenital de teclado + trackpad. */
const TECLADO: Record<string, Partial<Record<ColorKey, string>>> = {
  "13": {
    medianoche: U("productos/56092-g23284/44e85b3552.jpg"),
    "blanco-estelar": U("productos/56391-g24176/2a908dc142.jpg"),
    plata: U("productos/56697-g24271/29652dfecd.jpg"),
  },
  "15": {
    medianoche: U("productos/56097-g23329/efafc7c815.jpg"),
  },
};

/** Perfil con los puertos. Sólo existe la toma del 13"; de costado son iguales. */
const PERFIL = U("productos/56092-g23285/8f8e2cf37b.jpg");

/**
 * Los cuatro colores alineados. Hay una versión por tamaño y las etiquetas
 * ("Azul cielo", "Color plata"…) están quemadas en la imagen: de ahí sale el
 * criterio de nombres en español que usa toda la página.
 */
const LINEUP: Record<string, string> = {
  "13": U("productos/56443-g24151/4441783841.jpg"),
  "15": U("productos/56097-g23330/0a35e7e3f0.jpg"),
};

/** Placa del chip M4 + autonomía. */
const CHIP: Partial<Record<ColorKey, string>> = {
  medianoche: U("productos/56092-g23300/5df6a5377e.jpg"),
  "azul-cielo": U("productos/56443-g24152/af5ad6b8ff.jpg"),
  "blanco-estelar": U("productos/56391-g24077/62a251c263.jpg"),
};

/**
 * Pantalla Liquid Retina + cámara/mics/bocinas. La medida está impresa en la
 * imagen (13,6" vs 15,3"), así que se elige por tamaño antes que por color.
 */
const PANTALLA: Record<string, Partial<Record<ColorKey, string>>> = {
  "13": {
    medianoche: U("productos/56092-g23287/656ac6b3ac.jpg"),
    "azul-cielo": U("productos/56443-g24153/62123f40f2.jpg"),
    "blanco-estelar": U("productos/56391-g24078/ee05ee6a0c.jpg"),
  },
  "15": {
    medianoche: U("productos/56097-g23332/7a01cb8508.jpg"),
  },
};

/** Elige la toma del color pedido y, si no existe, la del color más parecido. */
function porColor(
  mapa: Partial<Record<ColorKey, string>>,
  color: ColorKey,
  orden: ColorKey[] = ["medianoche", "blanco-estelar", "azul-cielo", "plata"]
): string | null {
  if (mapa[color]) return mapa[color]!;
  for (const alt of orden) if (mapa[alt]) return mapa[alt]!;
  return null;
}

export type Story = {
  /** Imágenes del hero sticky, en orden de aparición al scrollear. */
  hero: Shot[];
  bandas: Banda[];
};

/**
 * Arma el guion para una MacBook Air según color y tamaño elegidos.
 * Devuelve null si la familia no tiene guion cargado (el PDP degrada a la
 * galería común).
 */
export function getMacBookAirStory(
  colorKey: string,
  pulgadas: string | null,
  chipLabel: string | null
): Story | null {
  const color = (["medianoche", "blanco-estelar", "azul-cielo", "plata"] as ColorKey[]).includes(
    colorKey as ColorKey
  )
    ? (colorKey as ColorKey)
    : "medianoche";
  const size = pulgadas === "15" ? "15" : "13";
  const pulgadasLabel = size === "15" ? "15,3" : "13,6";
  const bocinas = size === "15" ? "seis bocinas" : "cuatro bocinas";
  const lineup = LINEUP[size] ?? LINEUP["13"];

  const hero = porColor(HERO[size] ?? {}, color) ?? porColor(HERO["13"], color);
  const teclado = porColor(TECLADO[size] ?? {}, color) ?? porColor(TECLADO["13"], color);
  // La placa que tenemos dice "M4": no la mostramos sobre un SKU de otro chip.
  const chip = chipLabel === "M4" ? porColor(CHIP, color) : null;
  // La medida va impresa en la foto: si no hay toma del tamaño pedido,
  // preferimos omitir la banda antes que mostrar otra pulgada.
  const pantalla = PANTALLA[size] ? porColor(PANTALLA[size], color) : null;

  if (!hero) return null;

  const heroShots: Shot[] = [
    { src: hero, alt: `MacBook Air ${size}" abierta, vista frontal`, encuadre: "contain" },
    ...(teclado
      ? [
          {
            src: teclado,
            alt: `Teclado y trackpad de la MacBook Air ${size}"`,
            encuadre: "contain" as const,
          },
        ]
      : []),
    { src: PERFIL, alt: "Perfil de la MacBook Air con sus puertos", encuadre: "contain" },
    { src: lineup, alt: "Los cuatro colores de la MacBook Air", encuadre: "contain" },
  ];

  const bandas: Banda[] = [
    {
      id: "diseno",
      kicker: "Diseño",
      titulo: "Cuatro colores. Un solo gesto.",
      copy:
        "Aluminio reciclado, 1,13 cm de perfil y poco más de un kilo. Elegís el color arriba y toda esta página se acomoda al que tengas puesto.",
      layout: "figura-completa",
      tono: "color",
      shots: [{ src: lineup, alt: "Azul cielo, color plata, blanco estelar y medianoche", encuadre: "contain" }],
      datos: [
        { valor: "1,13 cm", label: "de espesor" },
        { valor: "1,24 kg", label: "de peso" },
        { valor: "100%", label: "aluminio reciclado" },
      ],
    },
    ...(chip
      ? [
          {
            id: "chip",
            kicker: "Rendimiento",
            titulo: `El chip ${chipLabel} hace el trabajo pesado.`,
            copy:
              "CPU y GPU en una sola pieza de silicio, con Neural Engine para las funciones de Apple Intelligence. Silenciosa, porque no necesita ventilador.",
            layout: "figura-izquierda" as const,
            tono: "claro" as const,
            shots: [{ src: chip, alt: "Chip Apple M4", encuadre: "contain" as const }],
            datos: [
              { valor: "18 h", label: "de batería" },
              { valor: "16 núcleos", label: "Neural Engine" },
              { valor: "0 dB", label: "sin ventilador" },
            ],
          },
        ]
      : []),
    ...(pantalla
      ? [
          {
            id: "pantalla",
            kicker: "Pantalla",
            titulo: `Liquid Retina de ${pulgadasLabel} pulgadas.`,
            copy: `Mil millones de colores y 500 nits de brillo. Arriba, la cámara Center Stage de 12 MP te sigue cuando te movés; abajo, ${bocinas} con Audio Espacial.`,
            layout: "figura-derecha" as const,
            tono: "claro" as const,
            shots: [
              { src: pantalla, alt: `Pantalla Liquid Retina de ${pulgadasLabel} pulgadas`, encuadre: "contain" as const },
            ],
            datos: [
              { valor: "1000 M", label: "de colores" },
              { valor: "500 nits", label: "de brillo" },
              { valor: "12 MP", label: "Center Stage" },
            ],
          },
        ]
      : []),
    {
      id: "puertos",
      kicker: "Todos los días",
      titulo: "Se abre y ya está lista.",
      copy:
        "Touch ID para desbloquear y pagar, dos puertos Thunderbolt, MagSafe para cargar sin ocuparlos y minijack para los auriculares de siempre.",
      layout: "duo",
      tono: "oscuro",
      // "cover" acompaña al recorte 4:3 de la banda dúo (ver preview.css).
      shots: [
        ...(teclado
          ? [{ src: teclado, alt: "Teclado Magic Keyboard con Touch ID", encuadre: "cover" as const }]
          : []),
        { src: PERFIL, alt: "Puertos Thunderbolt, MagSafe y minijack", encuadre: "cover" },
      ],
      datos: [
        { valor: "2×", label: "Thunderbolt" },
        { valor: "MagSafe", label: "carga dedicada" },
        { valor: "Touch ID", label: "en el teclado" },
      ],
    },
  ];

  return { hero: heroShots, bandas };
}
