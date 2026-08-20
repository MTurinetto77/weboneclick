"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type Dispositivo,
  type Elemento,
  type EstadoBanner,
  type PropsElemento,
  type TipoElemento,
  cuentaPropias,
  esPropia,
  estadoDemo,
  FORMAS_BOTON,
  FUENTES,
  MEDIDAS,
  medidasDe,
  NOMBRE_PROP,
  nuevoElemento,
  nuevoId,
  propsDe,
} from "./tipos";
import { bannerImageUrl } from "@/lib/banners";
import { type Encaje, generarHtml, leerHtml } from "./html";
import {
  type BannerResumen,
  cargarBanner,
  guardarBanner,
  listarBanners,
  subirFondo,
} from "./guardar";
import { ESTILOS } from "./estilos";

const CLAVE_STORAGE = "oc-prototipo-banner-v3";
const TOLERANCIA_IMAN = 7; // px de diseño

/** Guías fijas del lienzo: bordes, cuartos, tercios y centro. */
const GUIAS_LIENZO = [0, 25, 100 / 3, 50, 200 / 3, 75, 100];

type ModoArrastre = "mover" | "n" | "s" | "e" | "o" | "ne" | "no" | "se" | "so" | "rotar";

type Arrastre = {
  id: string;
  modo: ModoArrastre;
  sx: number;
  sy: number;
  p: PropsElemento;
  cxPantalla: number;
  cyPantalla: number;
};

const HERRAMIENTAS: {
  tipo: TipoElemento;
  label: string;
  icono: string;
  ajuste?: Partial<PropsElemento>;
}[] = [
  { tipo: "texto", label: "Texto", icono: "T" },
  { tipo: "boton", label: "Botón", icono: "⬭" },
  { tipo: "rect", label: "Rectángulo", icono: "▬" },
  { tipo: "rect", label: "Cuadrado", icono: "■", ajuste: { fondo: "#0071e3", radio: 8, x: 40, y: 25, w: 18, h: 40 } },
  { tipo: "circulo", label: "Círculo", icono: "●" },
  { tipo: "linea", label: "Línea", icono: "─" },
  { tipo: "triangulo", label: "Triángulo", icono: "▲" },
  { tipo: "imagen", label: "Imagen", icono: "🖼" },
];

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/** Busca el mejor imán para un eje: prueba borde inicial, centro y borde final. */
function iman(pos: number, size: number, guias: number[], tol: number) {
  const candidatos = [
    { borde: pos, off: 0 },
    { borde: pos + size / 2, off: size / 2 },
    { borde: pos + size, off: size },
  ];
  let mejor: { pos: number; guia: number } | null = null;
  let mejorDist = tol;
  for (const c of candidatos) {
    for (const g of guias) {
      const d = Math.abs(c.borde - g);
      if (d < mejorDist) {
        mejorDist = d;
        mejor = { pos: g - c.off, guia: g };
      }
    }
  }
  return mejor;
}

/** Solo corre en el cliente: este componente se monta con `ssr: false`. */
function cargarEstado(): EstadoBanner {
  try {
    const raw = window.localStorage.getItem(CLAVE_STORAGE);
    if (raw) return JSON.parse(raw) as EstadoBanner;
  } catch {
    /* JSON roto o storage bloqueado: arrancamos con el demo */
  }
  return estadoDemo();
}

export function BannerEditorPrototipo() {
  const [estado, setEstado] = useState<EstadoBanner>(cargarEstado);
  const [disp, setDisp] = useState<Dispositivo>("desktop");
  const [sel, setSel] = useState<string | null>(null);
  const [previsual, setPrevisual] = useState(false);
  const [avanzado, setAvanzado] = useState(false);
  const [verGuias, setVerGuias] = useState(true);
  const [codigo, setCodigo] = useState<"no" | "html" | "json">("no");
  const [guias, setGuias] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const [anchoStage, setAnchoStage] = useState(1000);
  const [zoom, setZoom] = useState<"fit" | number>("fit");
  const [panelOculto, setPanelOculto] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [encaje, setEncaje] = useState<Encaje>("rellenar");

  /* --- publicación --- */
  const [lista, setLista] = useState<BannerResumen[]>([]);
  const [destino, setDestino] = useState<number | "nuevo">("nuevo");
  const [titulo, setTitulo] = useState("Banner nuevo");
  const [orden, setOrden] = useState(0);
  const [activo, setActivo] = useState(false);
  const [desde, setDesde] = useState(() => new Date().toISOString().slice(0, 16));
  const [hasta, setHasta] = useState("");
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [deshacer, setDeshacer] = useState<{ id: number; html: string | null } | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const lienzoRef = useRef<HTMLDivElement>(null);
  const arrastreRef = useRef<Arrastre | null>(null);
  const fileDesktopRef = useRef<HTMLInputElement>(null);
  const fileMobileRef = useRef<HTMLInputElement>(null);

  const medidas = medidasDe(estado.ubicacion);
  const caja = disp === "desktop" ? medidas.desktop : medidas.mobile;
  /** El área de diseño es el banner completo: se puede llegar a cualquier borde. */
  const W = caja.w;
  const H = caja.h;
  const fondo = disp === "desktop" ? estado.fondoDesktop : estado.fondoMobile;
  const ajuste = Math.min(1, anchoStage / W);
  const escala = zoom === "fit" ? ajuste : zoom;
  const entra = W * escala <= anchoStage;

  const seleccionado = useMemo(
    () => estado.elementos.find((e) => e.id === sel) ?? null,
    [estado.elementos, sel],
  );

  const html = useMemo(() => generarHtml(estado, encaje), [encaje, estado]);

  useEffect(() => {
    try {
      window.localStorage.setItem(CLAVE_STORAGE, JSON.stringify(estado));
    } catch {
      /* sin espacio o modo privado: no es crítico en el prototipo */
    }
  }, [estado]);

  const refrescarLista = useCallback(() => {
    listarBanners()
      .then(setLista)
      .catch(() => setAviso({ tipo: "error", texto: "No se pudo leer la lista de banners" }));
  }, []);

  useEffect(() => {
    refrescarLista();
  }, [refrescarLista]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const medir = () => setAnchoStage(el.clientWidth);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ---------- mutaciones ---------- */

  /** Contenido (texto, link, imagen): siempre compartido entre dispositivos. */
  const setContenido = useCallback((id: string, cambios: Partial<Elemento>) => {
    setEstado((prev) => ({
      ...prev,
      elementos: prev.elementos.map((e) => (e.id === id ? { ...e, ...cambios } : e)),
    }));
  }, []);

  /**
   * Características: en desktop se escribe el diseño compartido; en mobile se
   * guardan SOLO como override, sin tocar desktop.
   */
  const setProp = useCallback(
    (id: string, cambios: Partial<PropsElemento>) => {
      setEstado((prev) => ({
        ...prev,
        elementos: prev.elementos.map((e) => {
          if (e.id !== id) return e;
          if (disp === "mobile") return { ...e, mobile: { ...(e.mobile ?? {}), ...cambios } };
          return { ...e, base: { ...e.base, ...cambios } };
        }),
      }));
    },
    [disp],
  );

  /** Devuelve una propiedad a heredar de desktop. */
  const quitarProp = useCallback((id: string, k: keyof PropsElemento) => {
    setEstado((prev) => ({
      ...prev,
      elementos: prev.elementos.map((e) => {
        if (e.id !== id || !e.mobile) return e;
        const m = { ...e.mobile };
        delete m[k];
        return { ...e, mobile: Object.keys(m).length ? m : null };
      }),
    }));
  }, []);

  const agregar = useCallback((tipo: TipoElemento, ajuste?: Partial<PropsElemento>) => {
    setEstado((prev) => {
      const zMax = prev.elementos.reduce((m, e) => Math.max(m, e.z), 0);
      const el = nuevoElemento(tipo, zMax + 1);
      if (ajuste) el.base = { ...el.base, ...ajuste };
      setSel(el.id);
      return { ...prev, elementos: [...prev.elementos, el] };
    });
  }, []);

  const eliminar = useCallback((id: string) => {
    setEstado((prev) => ({ ...prev, elementos: prev.elementos.filter((e) => e.id !== id) }));
    setSel((s) => (s === id ? null : s));
  }, []);

  const duplicar = useCallback((id: string) => {
    setEstado((prev) => {
      const orig = prev.elementos.find((e) => e.id === id);
      if (!orig) return prev;
      const zMax = prev.elementos.reduce((m, e) => Math.max(m, e.z), 0);
      const copia: Elemento = {
        ...orig,
        id: nuevoId(),
        z: zMax + 1,
        base: { ...orig.base, x: clamp(orig.base.x + 3, 0, 95), y: clamp(orig.base.y + 3, 0, 95) },
        mobile: orig.mobile ? { ...orig.mobile } : null,
      };
      setSel(copia.id);
      return { ...prev, elementos: [...prev.elementos, copia] };
    });
  }, []);

  /** Capas: al frente / adelante / atrás / al fondo. El z es siempre compartido. */
  const capa = useCallback((id: string, accion: "frente" | "subir" | "bajar" | "fondo") => {
    setEstado((prev) => {
      const zs = prev.elementos.map((e) => e.z);
      const zMax = Math.max(...zs);
      const zMin = Math.min(...zs);
      if (accion === "frente") {
        return { ...prev, elementos: prev.elementos.map((e) => (e.id === id ? { ...e, z: zMax + 1 } : e)) };
      }
      if (accion === "fondo") {
        return { ...prev, elementos: prev.elementos.map((e) => (e.id === id ? { ...e, z: zMin - 1 } : e)) };
      }
      const ordenados = [...prev.elementos].sort((a, b) => a.z - b.z);
      const i = ordenados.findIndex((e) => e.id === id);
      const j = i + (accion === "subir" ? 1 : -1);
      if (i < 0 || j < 0 || j >= ordenados.length) return prev;
      const zi = ordenados[i].z;
      ordenados[i] = { ...ordenados[i], z: ordenados[j].z };
      ordenados[j] = { ...ordenados[j], z: zi };
      return { ...prev, elementos: ordenados };
    });
  }, []);

  /** Mide el tamaño real renderizado, necesario cuando el ancho/alto es automático. */
  const medirPct = useCallback((id: string) => {
    const cont = lienzoRef.current;
    const node = cont?.querySelector<HTMLElement>(`[data-id="${id}"]`);
    if (!cont || !node) return null;
    const r = node.getBoundingClientRect();
    const c = cont.getBoundingClientRect();
    if (!c.width || !c.height) return null;
    return { w: (r.width / c.width) * 100, h: (r.height / c.height) * 100 };
  }, []);

  const tamanoReal = useCallback(
    (el: Elemento, p: PropsElemento) => {
      const med = medirPct(el.id);
      return {
        w: p.wAuto && med ? med.w : p.w,
        h: (p.hAuto || el.tipo === "linea") && med ? med.h : p.h,
      };
    },
    [medirPct],
  );

  const alinear = useCallback(
    (modo: "izq" | "centroH" | "der" | "arriba" | "centroV" | "abajo") => {
      if (!seleccionado) return;
      const p = propsDe(seleccionado, disp);
      const { w, h } = tamanoReal(seleccionado, p);
      const mapa: Record<string, Partial<PropsElemento>> = {
        izq: { x: 0 },
        centroH: { x: (100 - w) / 2 },
        der: { x: 100 - w },
        arriba: { y: 0 },
        centroV: { y: (100 - h) / 2 },
        abajo: { y: 100 - h },
      };
      setProp(seleccionado.id, mapa[modo]);
    },
    [disp, seleccionado, setProp, tamanoReal],
  );

  /* ---------- arrastre ---------- */

  const iniciarArrastre = useCallback(
    (e: React.PointerEvent, id: string, modo: ModoArrastre) => {
      if (previsual) return;
      e.stopPropagation();
      e.preventDefault();
      const el = estado.elementos.find((x) => x.id === id);
      if (!el) return;
      const p = { ...propsDe(el, disp) };
      const r = lienzoRef.current?.getBoundingClientRect();
      arrastreRef.current = {
        id,
        modo,
        sx: e.clientX,
        sy: e.clientY,
        p,
        cxPantalla: r ? r.left + ((p.x + p.w / 2) / 100) * r.width : 0,
        cyPantalla: r ? r.top + ((p.y + p.h / 2) / 100) * r.height : 0,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setSel(id);
    },
    [disp, estado.elementos, previsual],
  );

  const moverArrastre = useCallback(
    (e: React.PointerEvent) => {
      const a = arrastreRef.current;
      if (!a) return;
      e.preventDefault();

      if (a.modo === "rotar") {
        const ang = (Math.atan2(e.clientY - a.cyPantalla, e.clientX - a.cxPantalla) * 180) / Math.PI + 90;
        const paso = e.shiftKey ? 15 : 1;
        setProp(a.id, { rot: Math.round(ang / paso) * paso });
        return;
      }

      const dxPct = ((e.clientX - a.sx) / escala / W) * 100;
      const dyPct = ((e.clientY - a.sy) / escala / H) * 100;
      let { x, y, w, h } = a.p;
      const elMov = estado.elementos.find((x2) => x2.id === a.id);

      if (a.modo === "mover") {
        x = a.p.x + dxPct;
        y = a.p.y + dyPct;

        const guiasX = [...GUIAS_LIENZO];
        const guiasY = [...GUIAS_LIENZO];
        for (const el of estado.elementos) {
          if (el.id === a.id) continue;
          const p = propsDe(el, disp);
          const t = tamanoReal(el, p);
          guiasX.push(p.x, p.x + t.w / 2, p.x + t.w);
          guiasY.push(p.y, p.y + t.h / 2, p.y + t.h);
        }
        const propio = elMov ? tamanoReal(elMov, a.p) : { w, h };
        const tolX = (TOLERANCIA_IMAN / W) * 100;
        const tolY = (TOLERANCIA_IMAN / H) * 100;
        const mx = e.altKey ? null : iman(x, propio.w, guiasX, tolX);
        const my = e.altKey ? null : iman(y, propio.h, guiasY, tolY);
        if (mx) x = mx.pos;
        if (my) y = my.pos;
        setGuias({ x: mx ? mx.guia : null, y: my ? my.guia : null });

        // Por defecto el elemento no puede salirse: si se sale, en la home se
        // recorta y es un accidente difícil de notar. Con Alt se permite, para
        // los diseños que a propósito sangran por el borde.
        if (!e.altKey) {
          x = clamp(x, 0, Math.max(0, 100 - propio.w));
          y = clamp(y, 0, Math.max(0, 100 - propio.h));
        }
        setProp(a.id, { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 });
        return;
      }

      // tirar de un tirador fija ese eje: deja de ser automático
      const tocaX = a.modo.includes("e") || a.modo.includes("o");
      const tocaY = a.modo.includes("n") || a.modo.includes("s");
      if (a.modo.includes("e")) w = a.p.w + dxPct;
      if (a.modo.includes("o")) {
        w = a.p.w - dxPct;
        x = a.p.x + dxPct;
      }
      if (a.modo.includes("s")) h = a.p.h + dyPct;
      if (a.modo.includes("n")) {
        h = a.p.h - dyPct;
        y = a.p.y + dyPct;
      }
      setProp(a.id, {
        ...(tocaX && a.p.wAuto ? { wAuto: false } : {}),
        ...(tocaY && a.p.hAuto ? { hAuto: false } : {}),
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
        w: Math.round(Math.max(2, w) * 100) / 100,
        h: Math.round(Math.max(1, h) * 100) / 100,
      });
    },
    [disp, escala, estado.elementos, H, setProp, tamanoReal, W],
  );

  const terminarArrastre = useCallback(() => {
    arrastreRef.current = null;
    setGuias({ x: null, y: null });
  }, []);

  /* ---------- teclado ---------- */

  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (!sel || editando || previsual) return;
      const t = ev.target as HTMLElement;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;

      if (ev.key === "Delete" || ev.key === "Backspace") {
        ev.preventDefault();
        eliminar(sel);
        return;
      }
      const paso = ev.shiftKey ? 5 : 0.5;
      const mapa: Record<string, [number, number]> = {
        ArrowLeft: [-paso, 0],
        ArrowRight: [paso, 0],
        ArrowUp: [0, -paso],
        ArrowDown: [0, paso],
      };
      const d = mapa[ev.key];
      if (!d) return;
      ev.preventDefault();
      const el = estado.elementos.find((x) => x.id === sel);
      if (!el) return;
      const p = propsDe(el, disp);
      setProp(sel, {
        x: clamp(p.x + d[0], 0, Math.max(0, 100 - p.w)),
        y: clamp(p.y + d[1], 0, Math.max(0, 100 - p.h)),
      });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [disp, editando, eliminar, estado.elementos, previsual, sel, setProp]);

  /* ---------- estilo de un elemento en el lienzo ---------- */

  function estiloElemento(el: Elemento): React.CSSProperties {
    const p = propsDe(el, disp);
    const s: React.CSSProperties = {
      position: "absolute",
      left: `${p.x}%`,
      top: `${p.y}%`,
      width: p.wAuto ? "max-content" : `${p.w}%`,
      maxWidth: p.wAuto ? `${100 - p.x}%` : undefined,
      height: el.tipo === "linea" ? `${p.grosor}px` : p.hAuto ? "auto" : `${p.h}%`,
      transform: p.rot ? `rotate(${p.rot}deg)` : undefined,
      zIndex: el.z,
      opacity: p.opacidad,
      borderRadius: el.tipo === "circulo" ? "50%" : `${p.radio}px`,
      clipPath: el.tipo === "triangulo" ? "polygon(50% 0,100% 100%,0 100%)" : undefined,
      boxShadow: p.sombra ? "0 10px 30px rgba(0,0,0,0.35)" : undefined,
      display: "flex",
      alignItems: "center",
      justifyContent: p.align === "left" ? "flex-start" : p.align === "right" ? "flex-end" : "center",
      textAlign: p.align,
      overflow: "hidden",
      boxSizing: "border-box",
    };
    if (p.variante === "contorno") s.border = `${Math.max(2, p.borde)}px solid ${p.fondo}`;
    else if (p.borde) s.border = `${p.borde}px solid ${p.bordeColor}`;
    if (el.tipo !== "texto" && el.tipo !== "imagen") {
      s.background = p.variante === "contorno" ? "transparent" : p.fondo;
    }
    if (el.tipo === "texto" || el.tipo === "boton") {
      s.fontSize = `clamp(${p.fsMin}px, ${p.fs}cqw, 400px)`;
      s.color = p.variante === "contorno" ? p.fondo : p.color;
      s.fontWeight = p.peso;
      s.fontFamily = p.fuente;
      s.fontStyle = p.italica ? "italic" : undefined;
      s.textTransform = p.mayusculas ? "uppercase" : undefined;
      s.letterSpacing = p.espaciado ? `${p.espaciado}em` : undefined;
      s.lineHeight = 1.2;
      s.padding = el.tipo === "boton" ? "0.62em 1.5em" : "0";
      s.whiteSpace = p.wAuto ? "nowrap" : "normal";
    }
    return s;
  }

  const ordenados = useMemo(() => [...estado.elementos].sort((a, b) => a.z - b.z), [estado.elementos]);

  /** Elementos que se salen del área y por lo tanto van a verse recortados. */
  const desbordados = useMemo(
    () =>
      estado.elementos.filter((el) => {
        const p = propsDe(el, disp);
        return p.x < 0 || p.y < 0 || (!p.wAuto && p.x + p.w > 100) || (!p.hAuto && p.y + p.h > 100);
      }),
    [disp, estado.elementos],
  );

  const copiar = useCallback(async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1600);
    } catch {
      /* sin permiso de portapapeles: el textarea igual permite copiar a mano */
    }
  }, []);

  /** Sube la imagen al servidor y devuelve la ruta que guarda la base. */
  const subirImagen = useCallback(async (file: File, etiqueta: string) => {
    setTrabajando(`Subiendo ${etiqueta}…`);
    setAviso(null);
    const fd = new FormData();
    fd.append("archivo", file);
    const r = await subirFondo(fd);
    setTrabajando(null);
    if (!r.ok) {
      setAviso({ tipo: "error", texto: r.error });
      return null;
    }
    return r.ruta;
  }, []);

  /* ---------- guardar ---------- */

  const publicar = useCallback(async () => {
    setTrabajando("Guardando…");
    setAviso(null);
    const r = await guardarBanner({
      id_banner: destino === "nuevo" ? null : destino,
      titulo,
      ubicacion: estado.ubicacion,
      orden,
      activo,
      vigencia_desde: desde,
      vigencia_hasta: hasta,
      html: generarHtml(estado, "rellenar"),
      fondoDesktop: estado.fondoDesktop,
      fondoMobile: estado.fondoMobile,
    });
    setTrabajando(null);
    if (!r.ok) {
      setAviso({ tipo: "error", texto: r.error });
      return;
    }
    setDestino(r.id_banner);
    setDeshacer(r.creado ? null : { id: r.id_banner, html: r.htmlAnterior });
    setAviso({
      tipo: "ok",
      texto: r.creado
        ? `Banner #${r.id_banner} creado y publicado en "${estado.ubicacion}".`
        : `Banner #${r.id_banner} actualizado en "${estado.ubicacion}".`,
    });
    refrescarLista();
  }, [activo, desde, destino, estado, hasta, orden, refrescarLista, titulo]);

  const traerBanner = useCallback(
    async (id: number) => {
      setTrabajando("Abriendo…");
      setAviso(null);
      const b = await cargarBanner(id);
      setTrabajando(null);
      if (!b) {
        setAviso({ tipo: "error", texto: "No se encontró ese banner" });
        return;
      }
      setTitulo(b.titulo);
      setOrden(b.orden);
      setActivo(b.activo);
      setDesde(b.vigencia_desde || new Date().toISOString().slice(0, 16));
      setHasta(b.vigencia_hasta);
      const doc = leerHtml(b.html);
      if (doc) {
        setEstado({ ...doc, ubicacion: b.ubicacion, fondoDesktop: b.imagen_desktop, fondoMobile: b.imagen_mobile });
        setAviso({ tipo: "ok", texto: "Diseño recuperado. Podés seguir editándolo." });
      } else {
        setEstado((prev) => ({
          ...prev,
          ubicacion: b.ubicacion,
          fondoDesktop: b.imagen_desktop,
          fondoMobile: b.imagen_mobile,
        }));
        setAviso({
          tipo: "error",
          texto:
            "Ese banner tiene HTML escrito a mano, así que no se puede recuperar el diseño. Traje los fondos y los datos; el contenido lo armás de nuevo. Si guardás, reemplazás el HTML viejo.",
        });
      }
      setSel(null);
    },
    [],
  );

  const revertir = useCallback(async () => {
    if (!deshacer) return;
    setTrabajando("Deshaciendo…");
    const { deshacerHtml } = await import("./guardar");
    const r = await deshacerHtml(deshacer.id, deshacer.html);
    setTrabajando(null);
    if (!r.ok) {
      setAviso({ tipo: "error", texto: r.error });
      return;
    }
    setDeshacer(null);
    setAviso({ tipo: "ok", texto: `Se restauró el HTML anterior del banner #${deshacer.id}.` });
  }, [deshacer]);

  const importar = useCallback(() => {
    const pegado = window.prompt("Pegá el HTML de un banner hecho con este editor:");
    if (!pegado) return;
    const doc = leerHtml(pegado);
    if (!doc) {
      window.alert("Ese HTML no lo generó este editor, así que no tiene el diseño adentro para recuperar.");
      return;
    }
    setEstado(doc);
    setSel(null);
  }, []);

  /* ---------- UI ---------- */

  return (
    <div className="bp-root">
      <style>{ESTILOS}</style>

      <div className="bp-toolbar">
        <div className="bp-seg">
          <button type="button" className={disp === "desktop" ? "on" : ""} onClick={() => setDisp("desktop")}>
            🖥 Desktop
          </button>
          <button type="button" className={disp === "mobile" ? "on" : ""} onClick={() => setDisp("mobile")}>
            📱 Mobile
          </button>
        </div>

        <select
          value={estado.ubicacion}
          onChange={(ev) => setEstado((p) => ({ ...p, ubicacion: ev.target.value }))}
          title="Ubicación en la home (define la medida real del banner)"
        >
          {MEDIDAS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label} — {m.desktop.w}×{m.desktop.h}
            </option>
          ))}
        </select>

        <span className="bp-sep" />

        {HERRAMIENTAS.map((t) => (
          <button key={t.label} type="button" className="bp-add" onClick={() => agregar(t.tipo, t.ajuste)}>
            <b>{t.icono}</b> {t.label}
          </button>
        ))}

        <span className="bp-spacer" />

        <label className="bp-check">
          <input type="checkbox" checked={verGuias} onChange={(ev) => setVerGuias(ev.target.checked)} />
          Guías
        </label>
        <label className="bp-check">
          <input type="checkbox" checked={previsual} onChange={(ev) => setPrevisual(ev.target.checked)} />
          Vista previa
        </label>
        <div className="bp-seg">
          <button type="button" className={codigo === "html" ? "on" : ""} onClick={() => setCodigo(codigo === "html" ? "no" : "html")}>
            HTML
          </button>
          <button type="button" className={codigo === "json" ? "on" : ""} onClick={() => setCodigo(codigo === "json" ? "no" : "json")}>
            JSON
          </button>
        </div>
        <button type="button" className="bp-ghost" onClick={() => { setEstado(estadoDemo()); setSel(null); }}>
          Reiniciar
        </button>
      </div>

      {disp === "mobile" ? (
        <p className="bp-modo">
          Estás editando <b>mobile</b>. Lo que cambies acá — tamaño, color, tipografía, posición — queda
          <b> solo en mobile</b> y no toca el diseño de desktop. El texto y los links sí son compartidos.
        </p>
      ) : null}

      <div className={`bp-cols${panelOculto ? " solo" : ""}`}>
        <div className="bp-stage-wrap">
          <div className="bp-medida">
            <b>
              {W}×{H} px
            </b>
            <span className="bp-zoom">
              {([["fit", "Ajustar"], [0.5, "50%"], [0.75, "75%"], [1, "100% real"], [1.5, "150%"]] as const).map(
                ([v, label]) => (
                  <button
                    key={String(v)}
                    type="button"
                    className={zoom === v ? "on" : ""}
                    onClick={() => setZoom(v as "fit" | number)}
                  >
                    {label}
                  </button>
                ),
              )}
            </span>
            <span className="bp-escala">
              viendo al {Math.round(escala * 100)}%
              {escala === 1 ? " — tamaño real" : ""}
            </span>
            <button type="button" className="bp-ghost" onClick={() => setPanelOculto((v) => !v)}>
              {panelOculto ? "Mostrar panel" : "Ocultar panel ⇥"}
            </button>
          </div>

          <div className="bp-stage" ref={stageRef}>
            <div
              className="bp-scaler"
              style={{ width: W * escala, height: H * escala, marginInline: entra ? "auto" : 0 }}
            >
              <div
                ref={lienzoRef}
                className={`bp-lienzo${previsual ? " previa" : ""}`}
                style={{
                  width: W,
                  height: H,
                  transform: `scale(${escala})`,
                  backgroundImage: fondo ? `url(${bannerImageUrl(fondo)})` : undefined,
                }}
                onPointerDown={() => setSel(null)}
              >
                {!fondo ? (
                  <button
                    type="button"
                    className="bp-sinfondo"
                    onPointerDown={(ev) => ev.stopPropagation()}
                    onClick={() =>
                      (disp === "desktop" ? fileDesktopRef : fileMobileRef).current?.click()
                    }
                  >
                    📤 Sin fondo de {disp} — clic acá para cargarlo
                  </button>
                ) : null}

                {verGuias && !previsual ? (
                  <div className="bp-rejilla" aria-hidden>
                    <span style={{ left: "33.333%" }} />
                    <span style={{ left: "66.667%" }} />
                    <span className="c" style={{ left: "50%" }} />
                    <i style={{ top: "33.333%" }} />
                    <i style={{ top: "66.667%" }} />
                    <i className="c" style={{ top: "50%" }} />
                  </div>
                ) : null}

                {ordenados.map((el) => {
                  const activo = el.id === sel && !previsual;
                  const propias = cuentaPropias(el);
                  return (
                    <div
                      key={el.id}
                      data-id={el.id}
                      className={`bp-el${activo ? " sel" : ""}`}
                      style={estiloElemento(el)}
                      onPointerDown={(ev) => iniciarArrastre(ev, el.id, "mover")}
                      onPointerMove={moverArrastre}
                      onPointerUp={terminarArrastre}
                      onPointerCancel={terminarArrastre}
                      onDoubleClick={() => {
                        if (el.tipo === "texto" || el.tipo === "boton") setEditando(el.id);
                      }}
                    >
                      {el.tipo === "imagen" ? (
                        el.src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={bannerImageUrl(el.src)} alt="" className="bp-img" />
                        ) : (
                          <span className="bp-ph">🖼 sin imagen</span>
                        )
                      ) : el.tipo === "texto" || el.tipo === "boton" ? (
                        editando === el.id ? (
                          <span
                            className="bp-edit"
                            contentEditable
                            suppressContentEditableWarning
                            autoFocus
                            onBlur={(ev) => {
                              setContenido(el.id, { texto: ev.currentTarget.textContent ?? "" });
                              setEditando(null);
                            }}
                            onKeyDown={(ev) => {
                              if (ev.key === "Enter") {
                                ev.preventDefault();
                                ev.currentTarget.blur();
                              }
                            }}
                            onPointerDown={(ev) => ev.stopPropagation()}
                          >
                            {el.texto}
                          </span>
                        ) : (
                          <span>{el.texto}</span>
                        )
                      ) : null}

                      {activo ? (
                        <>
                          {disp === "mobile" ? (
                            <span className={`bp-badge${propias ? " propio" : ""}`}>
                              {propias ? `${propias} propias de mobile` : "hereda de desktop"}
                            </span>
                          ) : null}
                          <span
                            className="bp-rot"
                            onPointerDown={(ev) => iniciarArrastre(ev, el.id, "rotar")}
                            onPointerMove={moverArrastre}
                            onPointerUp={terminarArrastre}
                            title="Rotar (Shift = de a 15°)"
                          />
                          {(["no", "n", "ne", "e", "se", "s", "so", "o"] as const).map((m) => (
                            <span
                              key={m}
                              className={`bp-h bp-h-${m}`}
                              onPointerDown={(ev) => iniciarArrastre(ev, el.id, m)}
                              onPointerMove={moverArrastre}
                              onPointerUp={terminarArrastre}
                            />
                          ))}
                        </>
                      ) : null}
                    </div>
                  );
                })}

                {guias.x !== null ? <span className="bp-guia bp-guia-v" style={{ left: `${guias.x}%` }} /> : null}
                {guias.y !== null ? <span className="bp-guia bp-guia-h" style={{ top: `${guias.y}%` }} /> : null}
              </div>
            </div>
          </div>

          {desbordados.length && !previsual ? (
            <p className="bp-desborde">
              ⚠ {desbordados.length === 1 ? "Un elemento se sale" : `${desbordados.length} elementos se salen`}{" "}
              del área de contenido y van a verse recortados en la home:{" "}
              {desbordados.map((el) => el.texto || el.tipo).join(", ")}.
              <button
                type="button"
                onClick={() =>
                  desbordados.forEach((el) => {
                    const p = propsDe(el, disp);
                    setProp(el.id, {
                      x: clamp(p.x, 0, p.wAuto ? 95 : Math.max(0, 100 - p.w)),
                      y: clamp(p.y, 0, p.hAuto ? 95 : Math.max(0, 100 - p.h)),
                    });
                  })
                }
              >
                Traerlos adentro
              </button>
            </p>
          ) : null}

          <p className="bp-tip">
            Arrastrá para mover · tiradores para redimensionar · doble clic para escribir · flechas para
            ajustar fino (Shift = de a 5) · Alt desactiva el imán y permite salirse del área · Supr borra
          </p>

          {codigo === "html" ? (
            <div className="bp-codigo">
              <div className="bp-codigo-head">
                <b>HTML generado</b>
                <span>
                  Esto es lo que va al campo <code>banner.html</code> que ya usa la home. Vos no lo
                  editás: lo escribe el editor.
                </span>
                <div>
                  <select
                    value={encaje}
                    onChange={(ev) => setEncaje(ev.target.value as Encaje)}
                    title="Cómo encaja el banner donde lo pegues"
                  >
                    <option value="rellenar">Rellenar el contenedor de la home</option>
                    <option value="autonomo">Autónomo (define su propio alto)</option>
                  </select>
                  <button type="button" onClick={() => copiar(html)}>{copiado ? "✓ Copiado" : "Copiar HTML"}</button>
                  <button type="button" onClick={importar}>Abrir un HTML</button>
                </div>
              </div>
              <textarea readOnly value={html} rows={16} spellCheck={false} />
              <p className="bp-nota">
                Las características propias de mobile viajan como un bloque{" "}
                <code>@media (max-width:640px)</code>. El diseño completo va adentro del atributo{" "}
                <code>data-oc-doc</code>, así que se puede volver a abrir y seguir editando.
              </p>
            </div>
          ) : null}

          {codigo === "json" ? <pre className="bp-json">{JSON.stringify(estado, null, 2)}</pre> : null}
        </div>

        <aside className="bp-panel" hidden={panelOculto}>
          <section className="bp-bloque">
            <h3>Fondo del banner</h3>

            <label>Wallpaper desktop 🖥</label>
            {estado.fondoDesktop ? (
              <div className="bp-miniatura">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={bannerImageUrl(estado.fondoDesktop)} alt="" />
                <button type="button" onClick={() => setEstado((p) => ({ ...p, fondoDesktop: "" }))}>
                  Quitar
                </button>
              </div>
            ) : null}
            <button type="button" className="bp-subir" onClick={() => fileDesktopRef.current?.click()}>
              📤 Elegir imagen de desktop
            </button>
            <input
              ref={fileDesktopRef}
              type="file"
              accept="image/*"
              hidden
              onChange={async (ev) => {
                const f = ev.target.files?.[0];
                if (!f) return;
                const ruta = await subirImagen(f, "fondo desktop");
                if (ruta) setEstado((p) => ({ ...p, fondoDesktop: ruta }));
              }}
            />
            <input
              value={estado.fondoDesktop}
              placeholder="…o pegá una URL: /oneclick/banners/hero.jpg"
              onChange={(ev) => setEstado((p) => ({ ...p, fondoDesktop: ev.target.value }))}
            />

            <label>Wallpaper mobile 📱</label>
            {estado.fondoMobile ? (
              <div className="bp-miniatura">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={bannerImageUrl(estado.fondoMobile)} alt="" />
                <button type="button" onClick={() => setEstado((p) => ({ ...p, fondoMobile: "" }))}>
                  Quitar
                </button>
              </div>
            ) : null}
            <button type="button" className="bp-subir" onClick={() => fileMobileRef.current?.click()}>
              📤 Elegir imagen de mobile
            </button>
            <input
              ref={fileMobileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={async (ev) => {
                const f = ev.target.files?.[0];
                if (!f) return;
                const ruta = await subirImagen(f, "fondo mobile");
                if (ruta) setEstado((p) => ({ ...p, fondoMobile: ruta }));
              }}
            />
            <input
              value={estado.fondoMobile}
              placeholder="…o pegá una URL (imagen más vertical)"
              onChange={(ev) => setEstado((p) => ({ ...p, fondoMobile: ev.target.value }))}
            />
            <p className="bp-nota">
              Es lo único que cambia entre dispositivos por defecto. Si no ponés uno de mobile, ese
              queda sin fondo.
            </p>
          </section>


          {seleccionado ? (
            <PanelElemento
              el={seleccionado}
              disp={disp}
              medidas={medidas}
              avanzado={avanzado}
              setAvanzado={setAvanzado}
              setContenido={setContenido}
              setProp={setProp}
              subirImagen={subirImagen}
              quitarProp={quitarProp}
              heredarTodo={() => setContenido(seleccionado.id, { mobile: null })}
              alinear={alinear}
              capa={(a) => capa(seleccionado.id, a)}
              duplicar={() => duplicar(seleccionado.id)}
              eliminar={() => eliminar(seleccionado.id)}
            />
          ) : (
            <section className="bp-bloque">
              <h3>Propiedades</h3>
              <p className="bp-nota">Seleccioná un elemento del lienzo para editarlo.</p>
            </section>
          )}

          <section className="bp-bloque">
            <h3>Capas</h3>
            <ul className="bp-capas">
              {[...estado.elementos].sort((a, b) => b.z - a.z).map((el) => (
                <li key={el.id} className={el.id === sel ? "on" : ""}>
                  <button type="button" onClick={() => setSel(el.id)}>
                    {HERRAMIENTAS.find((t) => t.tipo === el.tipo)?.icono}{" "}
                    {el.texto || HERRAMIENTAS.find((t) => t.tipo === el.tipo)?.label}
                    {cuentaPropias(el) ? <i className="bp-punto" title="Tiene características propias de mobile" /> : null}
                  </button>
                  <span>
                    <button type="button" onClick={() => capa(el.id, "frente")} title="Traer al frente">⤒</button>
                    <button type="button" onClick={() => capa(el.id, "subir")} title="Adelantar">↑</button>
                    <button type="button" onClick={() => capa(el.id, "bajar")} title="Atrasar">↓</button>
                    <button type="button" onClick={() => capa(el.id, "fondo")} title="Enviar al fondo">⤓</button>
                  </span>
                </li>
              ))}
            </ul>
            <p className="bp-nota">El primero de la lista es el que queda más adelante.</p>
          </section>
          <section className="bp-bloque bp-publicar">
            <h3>Publicar</h3>

            <label>¿Dónde va?</label>
            <select
              value={estado.ubicacion}
              onChange={(ev) => setEstado((p) => ({ ...p, ubicacion: ev.target.value }))}
            >
              {MEDIDAS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>

            <label>Banner de destino</label>
            <select
              value={String(destino)}
              onChange={(ev) => {
                const v = ev.target.value;
                setDestino(v === "nuevo" ? "nuevo" : Number(v));
                setDeshacer(null);
                setAviso(null);
              }}
            >
              <option value="nuevo">➕ Crear uno nuevo</option>
              {lista
                .filter((b) => b.ubicacion === estado.ubicacion)
                .map((b) => (
                  <option key={b.id_banner} value={b.id_banner}>
                    #{b.id_banner} · {b.titulo}
                    {b.activo ? "" : " (inactivo)"}
                    {b.delEditor ? " · editable" : ""}
                  </option>
                ))}
            </select>
            {destino !== "nuevo" ? (
              <button type="button" className="bp-ghost bp-ancho" onClick={() => traerBanner(destino)}>
                Abrir este banner en el editor
              </button>
            ) : null}

            <label>Título (para identificarlo en el listado)</label>
            <input value={titulo} onChange={(ev) => setTitulo(ev.target.value)} />

            <div className="bp-fila">
              <div>
                <label>Orden</label>
                <input type="number" value={orden} onChange={(ev) => setOrden(Number(ev.target.value))} />
              </div>
              <div>
                <label>Vigencia desde</label>
                <input type="datetime-local" value={desde} onChange={(ev) => setDesde(ev.target.value)} />
              </div>
            </div>
            <label>Vigencia hasta (vacío = sin fin)</label>
            <input type="datetime-local" value={hasta} onChange={(ev) => setHasta(ev.target.value)} />

            <label className="bp-check bp-activo">
              <input type="checkbox" checked={activo} onChange={(ev) => setActivo(ev.target.checked)} />
              Activo — se ve en la home
            </label>

            <button
              type="button"
              className="bp-guardar"
              disabled={!!trabajando}
              onClick={publicar}
            >
              {trabajando ?? (destino === "nuevo" ? "Crear y publicar" : "Guardar cambios")}
            </button>

            {aviso ? (
              <p className={`bp-resultado ${aviso.tipo}`}>
                {aviso.texto}
                {aviso.tipo === "ok" && deshacer ? (
                  <button type="button" onClick={revertir}>Deshacer</button>
                ) : null}
              </p>
            ) : null}

            <p className="bp-nota">
              Se escribe en el banner: el diseño va al campo <code>html</code> y los fondos a las
              imágenes. Dejalo <b>inactivo</b> para probarlo sin que salga en la home.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

/* ================= etiqueta con marca de override ================= */

function Etiqueta({
  children,
  k,
  el,
  disp,
  quitarProp,
}: {
  children: React.ReactNode;
  k?: keyof PropsElemento;
  el: Elemento;
  disp: Dispositivo;
  quitarProp: (id: string, k: keyof PropsElemento) => void;
}) {
  const propia = !!k && disp === "mobile" && esPropia(el, k);
  return (
    <label>
      {children}
      {propia && k ? (
        <button
          type="button"
          className="bp-ovr"
          title={`"${NOMBRE_PROP[k] ?? k}" es propio de mobile — clic para volver a heredar de desktop`}
          onClick={() => quitarProp(el.id, k)}
        >
          mobile ✕
        </button>
      ) : null}
    </label>
  );
}

/* ================= panel de propiedades ================= */

function PanelElemento({
  el,
  disp,
  medidas,
  avanzado,
  setAvanzado,
  setContenido,
  setProp,
  subirImagen,
  quitarProp,
  heredarTodo,
  alinear,
  capa,
  duplicar,
  eliminar,
}: {
  el: Elemento;
  disp: Dispositivo;
  medidas: (typeof MEDIDAS)[number];
  avanzado: boolean;
  setAvanzado: (v: boolean) => void;
  setContenido: (id: string, cambios: Partial<Elemento>) => void;
  setProp: (id: string, cambios: Partial<PropsElemento>) => void;
  subirImagen: (file: File, etiqueta: string) => Promise<string | null>;
  quitarProp: (id: string, k: keyof PropsElemento) => void;
  heredarTodo: () => void;
  alinear: (m: "izq" | "centroH" | "der" | "arriba" | "centroV" | "abajo") => void;
  capa: (a: "frente" | "subir" | "bajar" | "fondo") => void;
  duplicar: () => void;
  eliminar: () => void;
}) {
  const p = propsDe(el, disp);
  const esTexto = el.tipo === "texto" || el.tipo === "boton";
  const tieneRelleno = el.tipo !== "texto" && el.tipo !== "imagen";
  const propias = cuentaPropias(el);

  return (
    <section className="bp-bloque">
      <h3>
        Propiedades
        <span className="bp-tag">{el.tipo}</span>
      </h3>

      {disp === "mobile" ? (
        propias ? (
          <div className="bp-aviso">
            <b>{propias}</b> {propias === 1 ? "característica propia" : "características propias"} de mobile:{" "}
            {Object.keys(el.mobile ?? {})
              .map((k) => NOMBRE_PROP[k as keyof PropsElemento] ?? k)
              .join(", ")}
            .
            <button type="button" onClick={heredarTodo}>Volver a heredar todo de desktop</button>
          </div>
        ) : (
          <p className="bp-nota">
            Todo se hereda de desktop. Lo que cambies acá queda solo en mobile.
          </p>
        )
      ) : null}

      {esTexto ? (
        <>
          <label>
            Texto <span className="bp-compartido">compartido</span>
          </label>
          <textarea rows={2} value={el.texto} onChange={(ev) => setContenido(el.id, { texto: ev.target.value })} />
        </>
      ) : null}

      {el.tipo === "boton" || el.tipo === "imagen" ? (
        <>
          <label>
            {el.tipo === "boton" ? "Link (href)" : "URL de la imagen"}{" "}
            <span className="bp-compartido">compartido</span>
          </label>
          <input
            value={el.tipo === "boton" ? el.href : el.src}
            placeholder={el.tipo === "boton" ? "/catalogo" : "https://…"}
            onChange={(ev) =>
              setContenido(el.id, el.tipo === "boton" ? { href: ev.target.value } : { src: ev.target.value })
            }
          />
          {el.tipo === "imagen" ? (
            <input
              type="file"
              accept="image/*"
              onChange={async (ev) => {
                const f = ev.target.files?.[0];
                if (!f) return;
                const ruta = await subirImagen(f, "imagen");
                if (ruta) setContenido(el.id, { src: ruta });
              }}
            />
          ) : null}
        </>
      ) : null}

      {el.tipo === "boton" ? (
        <>
          <Etiqueta k="radio" el={el} disp={disp} quitarProp={quitarProp}>Forma</Etiqueta>
          <div className="bp-pills">
            {FORMAS_BOTON.map((f) => (
              <button
                key={f.value}
                type="button"
                className={p.radio === f.value ? "on" : ""}
                style={{ borderRadius: Math.min(f.value, 18) }}
                onClick={() => setProp(el.id, { radio: f.value })}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Etiqueta k="variante" el={el} disp={disp} quitarProp={quitarProp}>Estilo</Etiqueta>
          <div className="bp-pills">
            <button type="button" className={p.variante === "solido" ? "on" : ""} onClick={() => setProp(el.id, { variante: "solido" })}>
              Relleno
            </button>
            <button type="button" className={p.variante === "contorno" ? "on" : ""} onClick={() => setProp(el.id, { variante: "contorno" })}>
              Contorno
            </button>
          </div>
        </>
      ) : null}

      {esTexto ? (
        <>
          <Etiqueta k="fuente" el={el} disp={disp} quitarProp={quitarProp}>Tipografía</Etiqueta>
          <select value={p.fuente} onChange={(ev) => setProp(el.id, { fuente: ev.target.value })}>
            {FUENTES.map((f) => (
              <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                {f.label}
              </option>
            ))}
          </select>

          <Etiqueta k="fs" el={el} disp={disp} quitarProp={quitarProp}>
            Tamaño (fluido) —{" "}
            <b>
              ≈{Math.round((p.fs / 100) * medidas.desktop.w)}px desktop ·{" "}
              ≈{Math.max(p.fsMin, Math.round((p.fs / 100) * medidas.mobile.w))}px mobile
            </b>
          </Etiqueta>
          <input type="range" min={0.8} max={12} step={0.1} value={p.fs} onChange={(ev) => setProp(el.id, { fs: Number(ev.target.value) })} />

          <div className="bp-fila">
            <div>
              <Etiqueta k="peso" el={el} disp={disp} quitarProp={quitarProp}>Peso</Etiqueta>
              <select value={p.peso} onChange={(ev) => setProp(el.id, { peso: Number(ev.target.value) })}>
                {[300, 400, 500, 600, 700, 800, 900].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <Etiqueta k="align" el={el} disp={disp} quitarProp={quitarProp}>Alineación</Etiqueta>
              <select value={p.align} onChange={(ev) => setProp(el.id, { align: ev.target.value as PropsElemento["align"] })}>
                <option value="left">Izquierda</option>
                <option value="center">Centro</option>
                <option value="right">Derecha</option>
              </select>
            </div>
          </div>

          <div className="bp-autos">
            <label className="bp-check">
              <input type="checkbox" checked={p.italica} onChange={(ev) => setProp(el.id, { italica: ev.target.checked })} />
              Itálica
            </label>
            <label className="bp-check">
              <input type="checkbox" checked={p.mayusculas} onChange={(ev) => setProp(el.id, { mayusculas: ev.target.checked })} />
              MAYÚSCULAS
            </label>
          </div>

          <Etiqueta k="espaciado" el={el} disp={disp} quitarProp={quitarProp}>Espaciado entre letras: {p.espaciado.toFixed(2)}em</Etiqueta>
          <input type="range" min={-0.05} max={0.4} step={0.01} value={p.espaciado} onChange={(ev) => setProp(el.id, { espaciado: Number(ev.target.value) })} />
        </>
      ) : null}

      <div className="bp-fila">
        {esTexto && p.variante === "solido" ? (
          <div>
            <Etiqueta k="color" el={el} disp={disp} quitarProp={quitarProp}>Color texto</Etiqueta>
            <input type="color" value={p.color} onChange={(ev) => setProp(el.id, { color: ev.target.value })} />
          </div>
        ) : null}
        {tieneRelleno ? (
          <div>
            <Etiqueta k="fondo" el={el} disp={disp} quitarProp={quitarProp}>{el.tipo === "boton" ? "Color de la píldora" : "Color"}</Etiqueta>
            <input
              type="color"
              value={p.fondo.startsWith("#") ? p.fondo : "#000000"}
              onChange={(ev) => setProp(el.id, { fondo: ev.target.value })}
            />
          </div>
        ) : null}
        {el.tipo !== "circulo" && el.tipo !== "boton" && el.tipo !== "triangulo" ? (
          <div>
            <Etiqueta k="radio" el={el} disp={disp} quitarProp={quitarProp}>Redondeo {p.radio}px</Etiqueta>
            <input type="range" min={0} max={120} value={p.radio} onChange={(ev) => setProp(el.id, { radio: Number(ev.target.value) })} />
          </div>
        ) : null}
      </div>

      {el.tipo === "linea" ? (
        <>
          <Etiqueta k="grosor" el={el} disp={disp} quitarProp={quitarProp}>Grosor {p.grosor}px</Etiqueta>
          <input type="range" min={1} max={24} value={p.grosor} onChange={(ev) => setProp(el.id, { grosor: Number(ev.target.value) })} />
        </>
      ) : null}

      <label>Alinear en el lienzo</label>
      <div className="bp-alinear">
        <button type="button" onClick={() => alinear("izq")} title="Izquierda">⇤</button>
        <button type="button" onClick={() => alinear("centroH")} title="Centro horizontal">⇔</button>
        <button type="button" onClick={() => alinear("der")} title="Derecha">⇥</button>
        <button type="button" onClick={() => alinear("arriba")} title="Arriba">⇞</button>
        <button type="button" onClick={() => alinear("centroV")} title="Centro vertical">⇕</button>
        <button type="button" onClick={() => alinear("abajo")} title="Abajo">⇟</button>
      </div>

      <label>
        Capa <span className="bp-compartido">compartido</span>
      </label>
      <div className="bp-alinear">
        <button type="button" onClick={() => capa("frente")} title="Traer al frente">⤒ Frente</button>
        <button type="button" onClick={() => capa("subir")} title="Adelantar">↑</button>
        <button type="button" onClick={() => capa("bajar")} title="Atrasar">↓</button>
        <button type="button" onClick={() => capa("fondo")} title="Enviar al fondo">⤓ Fondo</button>
      </div>

      <div className="bp-autos">
        <label className="bp-check">
          <input type="checkbox" checked={p.wAuto} onChange={(ev) => setProp(el.id, { wAuto: ev.target.checked })} />
          Ancho automático
        </label>
        <label className="bp-check">
          <input type="checkbox" checked={p.hAuto} onChange={(ev) => setProp(el.id, { hAuto: ev.target.checked })} />
          Alto automático
        </label>
      </div>

      <button type="button" className="bp-toggle" onClick={() => setAvanzado(!avanzado)}>
        {avanzado ? "▾" : "▸"} Avanzado
      </button>

      {avanzado ? (
        <div className="bp-avanzado">
          <div className="bp-fila">
            <div>
              <Etiqueta k="x" el={el} disp={disp} quitarProp={quitarProp}>X %</Etiqueta>
              <input type="number" step={0.5} value={p.x} onChange={(ev) => setProp(el.id, { x: Number(ev.target.value) })} />
            </div>
            <div>
              <Etiqueta k="y" el={el} disp={disp} quitarProp={quitarProp}>Y %</Etiqueta>
              <input type="number" step={0.5} value={p.y} onChange={(ev) => setProp(el.id, { y: Number(ev.target.value) })} />
            </div>
          </div>
          <div className="bp-fila">
            <div>
              <Etiqueta k="w" el={el} disp={disp} quitarProp={quitarProp}>Ancho %</Etiqueta>
              <input type="number" step={0.5} value={p.w} onChange={(ev) => setProp(el.id, { w: Number(ev.target.value) })} />
            </div>
            <div>
              <Etiqueta k="h" el={el} disp={disp} quitarProp={quitarProp}>Alto %</Etiqueta>
              <input type="number" step={0.5} value={p.h} onChange={(ev) => setProp(el.id, { h: Number(ev.target.value) })} />
            </div>
          </div>

          <Etiqueta k="rot" el={el} disp={disp} quitarProp={quitarProp}>Ángulo {p.rot}°</Etiqueta>
          <input type="range" min={-180} max={180} value={p.rot} onChange={(ev) => setProp(el.id, { rot: Number(ev.target.value) })} />

          <Etiqueta k="opacidad" el={el} disp={disp} quitarProp={quitarProp}>Opacidad {Math.round(p.opacidad * 100)}%</Etiqueta>
          <input type="range" min={0} max={1} step={0.05} value={p.opacidad} onChange={(ev) => setProp(el.id, { opacidad: Number(ev.target.value) })} />

          {esTexto ? (
            <>
              <Etiqueta k="fsMin" el={el} disp={disp} quitarProp={quitarProp}>Piso de tamaño en mobile: {p.fsMin}px</Etiqueta>
              <input type="range" min={8} max={40} value={p.fsMin} onChange={(ev) => setProp(el.id, { fsMin: Number(ev.target.value) })} />
            </>
          ) : null}

          {p.variante === "solido" ? (
            <div className="bp-fila">
              <div>
                <Etiqueta k="borde" el={el} disp={disp} quitarProp={quitarProp}>Borde {p.borde}px</Etiqueta>
                <input type="range" min={0} max={12} value={p.borde} onChange={(ev) => setProp(el.id, { borde: Number(ev.target.value) })} />
              </div>
              <div>
                <Etiqueta k="bordeColor" el={el} disp={disp} quitarProp={quitarProp}>Color borde</Etiqueta>
                <input type="color" value={p.bordeColor} onChange={(ev) => setProp(el.id, { bordeColor: ev.target.value })} />
              </div>
            </div>
          ) : null}

          <label className="bp-check">
            <input type="checkbox" checked={p.sombra} onChange={(ev) => setProp(el.id, { sombra: ev.target.checked })} />
            Sombra
          </label>
        </div>
      ) : null}

      <div className="bp-acciones">
        <button type="button" onClick={duplicar}>Duplicar</button>
        <button type="button" className="peligro" onClick={eliminar}>Eliminar</button>
      </div>
    </section>
  );
}
