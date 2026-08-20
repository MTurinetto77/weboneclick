/**
 * Exportador JSON → HTML del editor visual (PROTOTIPO).
 *
 * Por qué existe: la home ya renderiza `banner.html`. En vez de reemplazar ese
 * campo, el editor lo ESCRIBE. Así el admin nunca toca HTML a mano, pero el
 * HTML sigue existiendo y todo lo que ya está publicado sigue funcionando.
 *
 * Ida y vuelta: el HTML generado lleva el diseño serializado en `data-oc-doc`,
 * así que el editor puede volver a abrirlo y seguir editando visualmente.
 * No hace falta ninguna columna nueva en la base de datos.
 */

import { bannerImageUrl } from "@/lib/banners";
import {
  type Elemento,
  type EstadoBanner,
  type PropsElemento,
  CONTENEDOR,
  medidasDe,
  propsDe,
} from "./tipos";

const ATRIBUTO_DOC = "data-oc-doc";

/* ---------------- utilidades ---------------- */

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Solo deja pasar URLs seguras. Corta `javascript:` y `data:`, que son la vía
 * clásica de inyección — hoy el textarea de HTML las acepta sin filtrar.
 */
export function urlSegura(u: string): string {
  // Las rutas de upload (banners/uuid.jpg) se resuelven a /api/uploads/…
  const t = bannerImageUrl((u || "").trim());
  if (!t) return "";
  if (/^(https?:)?\/\//i.test(t)) return t;
  if (/^(mailto:|tel:)/i.test(t)) return t;
  if (t.startsWith("/") || t.startsWith("#")) return t;
  return "";
}

function b64(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function deB64(texto: string): string {
  const bin = atob(texto);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Hash corto y estable del contenido: aísla el CSS de cada banner. */
function uidDe(estado: EstadoBanner): string {
  const s = JSON.stringify(estado);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function num(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/* ---------------- CSS de un elemento ---------------- */

/**
 * Declaraciones completas para un juego de características.
 * Se emite entero también para mobile: como una propiedad pisada puede
 * arrastrar a otras (p. ej. `variante` cambia fondo, borde y color a la vez),
 * escribir el bloque completo es lo único que garantiza el resultado correcto.
 */
function cssDe(el: Elemento, p: PropsElemento): string {
  const d: string[] = [
    "position:absolute",
    "box-sizing:border-box",
    "display:flex",
    "align-items:center",
    `justify-content:${p.align === "left" ? "flex-start" : p.align === "right" ? "flex-end" : "center"}`,
    `text-align:${p.align}`,
    `left:${num(p.x)}%`,
    `top:${num(p.y)}%`,
    p.wAuto ? `width:max-content;max-width:${num(100 - p.x)}%` : `width:${num(p.w)}%`,
    el.tipo === "linea" ? `height:${p.grosor}px` : p.hAuto ? "height:auto" : `height:${num(p.h)}%`,
    `transform:rotate(${num(p.rot)}deg)`,
    `opacity:${p.opacidad}`,
    `box-shadow:${p.sombra ? "0 10px 30px rgba(0,0,0,.35)" : "none"}`,
  ];

  if (el.tipo === "circulo") d.push("border-radius:50%");
  else if (el.tipo === "triangulo") d.push("clip-path:polygon(50% 0,100% 100%,0 100%)");
  else d.push(`border-radius:${p.radio}px`);

  if (el.tipo !== "texto" && el.tipo !== "imagen") {
    d.push(`background:${p.variante === "contorno" ? "transparent" : p.fondo}`);
  }
  if (p.variante === "contorno") d.push(`border:${Math.max(2, p.borde)}px solid ${p.fondo}`);
  else d.push(p.borde ? `border:${p.borde}px solid ${p.bordeColor}` : "border:0");

  if (el.tipo === "texto" || el.tipo === "boton") {
    d.push(`font-size:clamp(${p.fsMin}px,${num(p.fs)}cqw,400px)`);
    d.push(`color:${p.variante === "contorno" ? p.fondo : p.color}`);
    d.push(`font-weight:${p.peso}`);
    d.push(`font-family:${p.fuente}`);
    d.push("line-height:1.2");
    d.push(`font-style:${p.italica ? "italic" : "normal"}`);
    d.push(`text-transform:${p.mayusculas ? "uppercase" : "none"}`);
    d.push(`letter-spacing:${num(p.espaciado)}em`);
    d.push(el.tipo === "boton" ? "padding:.62em 1.5em" : "padding:0");
    d.push(`white-space:${p.wAuto ? "nowrap" : "normal"}`);
    if (el.tipo === "boton") d.push("text-decoration:none");
  }
  if (el.tipo === "imagen") d.push("overflow:hidden");

  return d.join(";");
}

/* ---------------- generación ---------------- */

/**
 * Cómo se encaja el banner donde lo peguen:
 *  - "rellenar": ocupa todo el contenedor de la home (oc-promo-card, oc-zagg-banner…).
 *    Es lo que hace falta porque `.oc-banner-slot` es `display:contents` y el
 *    contenido cae directo adentro de un grid/flex que ya define el alto.
 *  - "autonomo": define su propio alto por aspect-ratio. Para un contenedor vacío.
 */
export type Encaje = "rellenar" | "autonomo";

export function generarHtml(estado: EstadoBanner, encaje: Encaje = "rellenar"): string {
  const m = medidasDe(estado.ubicacion);
  const uid = uidDe(estado);
  const raiz = `ocb-${uid}`;
  const ordenados = [...estado.elementos].sort((a, b) => a.z - b.z);

  // Solo hacen falta en modo autónomo; en la home el fondo lo pinta el contenedor.
  const bgD = urlSegura(estado.fondoDesktop);
  const bgM = urlSegura(estado.fondoMobile);

  const reglas: string[] = [];
  /*
   * Geometría de la raíz.
   *
   * `width:100%` + `grid-column`/`flex` la hacen ocupar TODO el contenedor:
   * .oc-promo-card es un grid de 2 columnas y .oc-zagg-banner un flex, así que
   * sin esto el banner entraría como una celda y ocuparía media tarjeta.
   *
   * `height:100%` gana cuando el contenedor tiene alto definido (la tarjeta del
   * triple mide 214px fijos). Cuando no lo tiene — en mobile .oc-hero-live-grid
   * es `min-height:0` — el porcentaje no resuelve y manda `aspect-ratio`, que
   * evita que el banner colapse a cero de alto.
   *
   * El FONDO no se pinta acá: la home ya renderiza `imagen_desktop` por su
   * cuenta (<img class="oc-hero-live-bg">, .oc-mundial-bg, --oc-banner-bg…).
   * Pintarlo de nuevo lo duplicaba.
   */
  const caja =
    encaje === "rellenar"
      ? "position:absolute;inset:0"
      : `position:relative;width:100%;aspect-ratio:${m.desktop.w}/${m.desktop.h}`;

  const fondoPropio =
    encaje === "autonomo"
      ? `background-color:#1d1d1f;background-size:cover;background-position:center;` +
        `background-repeat:no-repeat${bgD ? `;background-image:url(${bgD})` : ""}`
      : "";

  reglas.push(`.${raiz}{${caja};container-type:inline-size;overflow:hidden${fondoPropio ? ";" + fondoPropio : ""}}`);

  /*
   * El contenedor de la home trae padding y un min-height pensados para el
   * contenido viejo. Como el banner se posiciona en absoluto (inset:0) no
   * aporta alto, así que hay que fijárselo al contenedor — y sacarle el padding,
   * que si no corre todo hacia adentro y descoloca respecto del editor.
   *
   * Va acotado con :has() para que aplique SOLO donde está este banner: ningún
   * otro banner de la home se ve afectado.
   */
  const cont = encaje === "rellenar" ? CONTENEDOR[estado.ubicacion] : null;
  if (cont) {
    // `width:100%;max-width:none;margin-inline:0` libera al contenedor de su
    // ancho máximo centrado. Sin esto el hero encierra todo en 980px y no se
    // puede poner un elemento pegado al borde del banner.
    reglas.push(
      `${cont}:has(.${raiz}){width:100%;max-width:none;margin-inline:0;padding:0;` +
        `min-height:${m.desktop.h}px}`,
    );
  }

  for (const el of ordenados) {
    reglas.push(`.${raiz} .e-${el.id}{z-index:${el.z};${cssDe(el, el.base)}}`);
  }
  if (estado.elementos.some((e) => e.tipo === "imagen")) {
    reglas.push(
      `.${raiz} .e-img{width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block}`,
    );
  }

  /* --- mobile: aspecto, fondo propio y características independizadas --- */
  const mob: string[] = [];
  // El aspecto cambia bastante entre dispositivos, así que se declara siempre.
  const cajaMob = `aspect-ratio:${m.mobile.w}/${m.mobile.h}`;
  const fondoMob = encaje === "autonomo" && bgM ? `;background-image:url(${bgM})` : "";
  if (encaje === "autonomo") {
    mob.push(`.${raiz}{${cajaMob}${fondoMob}}`);
  }
  if (cont) {
    mob.push(`${cont}:has(.${raiz}){min-height:${m.mobile.h}px}`);
  }
  for (const el of ordenados) {
    if (el.mobile && Object.keys(el.mobile).length) {
      mob.push(`.${raiz} .e-${el.id}{${cssDe(el, propsDe(el, "mobile"))}}`);
    }
  }
  reglas.push(`@media (max-width:640px){${mob.join("")}}`);

  /* --- marcado --- */
  const cuerpo = ordenados
    .map((el) => {
      const clase = `e-${el.id}`;
      if (el.tipo === "imagen") {
        const src = urlSegura(el.src);
        return `<div class="${clase}">${src ? `<img class="e-img" src="${esc(src)}" alt="">` : ""}</div>`;
      }
      if (el.tipo === "boton") {
        const href = urlSegura(el.href);
        return href
          ? `<a class="${clase}" href="${esc(href)}">${esc(el.texto)}</a>`
          : `<div class="${clase}">${esc(el.texto)}</div>`;
      }
      if (el.tipo === "texto") return `<div class="${clase}">${esc(el.texto)}</div>`;
      return `<div class="${clase}"></div>`;
    })
    .join("\n    ");

  const doc = esc(b64(JSON.stringify(estado)));

  return `<style>
${reglas.join("\n")}
</style>
<div class="${raiz}" ${ATRIBUTO_DOC}="${doc}">
    ${cuerpo}
</div>`;
}

/* ---------------- lectura de vuelta ---------------- */

/**
 * Recupera el diseño desde un HTML generado por este editor.
 * Devuelve null si el HTML es de los viejos (escritos a mano): en ese caso no
 * hay nada que recuperar y el admin arranca de cero, sin perder el HTML actual.
 */
export function leerHtml(html: string): EstadoBanner | null {
  if (!html) return null;
  const m = html.match(/data-oc-doc="([^"]*)"/);
  if (!m) return null;
  try {
    const crudo = m[1]
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
    return JSON.parse(deB64(crudo)) as EstadoBanner;
  } catch {
    return null;
  }
}
