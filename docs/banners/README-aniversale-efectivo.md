# Banner "Aniversale · Efectivo 25%"

Archivo: [`aniversale-efectivo.html`](./aniversale-efectivo.html) — pegar **completo** en el
campo HTML de `/admin/banners`, ubicación `hero`.

Es solo `<style>` + markup: no lleva `<html>`, `<head>` ni preview. No se
previsualiza con `file://`; se ve en el sitio.

---

## Autocontenido

No depende de ningún archivo subido ni deployado. El "27" va embebido en base64
dentro del CSS, así que `imagen_desktop` / `imagen_mobile` pueden ser cualquier
cosa: el banner las tapa con su propio negro.

El fondo va separado del texto:

- el negro es CSS (`background: #000`)
- el "27" metálico es un WebP con alpha extraído del PDF, embebido como data URI
  en `.oc-aniv2-fondo` (900 × 599, 37 KB → 50 KB en base64)
- todo el copy (títulos, `25%`, píldora y CTA) es HTML de verdad → editable,
  seleccionable, indexable y nítido en cualquier densidad de pantalla

---

## Presupuesto de bytes ⚠️

`banner.html` es **MySQL TEXT: tope duro de 65.535 bytes**, y MySQL trunca sin
avisar. El archivo pesa **55,7 KB**, quedan ~9,8 KB de margen.

Si editando el copy te pasás del tope, **no agregues otra imagen**: bajá la
resolución del data URI. Con el WebP original a 1031 px el total daba ~75 KB y
se cortaba.

Calidad del arte medida contra el original, al tamaño real de pantalla:
48,6 dB a 410 px y 47,1 dB a 543 px (los dos casos entre 1440 y 1920 px de
viewport). A 900 px de fuente hay resolución de sobra para retina a 1440.

---

## Fidelidad al diseño

Medidas tomadas del PDF original (3686,05 × 1400 desktop / 1080 × 1400 mobile),
sacadas de los content streams y expresadas en `cqw` / `%`. Verificado
renderizando el HTML a esos tamaños y comparando píxel a píxel contra el render
del PDF: **±2 px en todos los elementos**.

Única diferencia conocida: los textos grandes quedan 6-9% más bajos que el PDF.
La tipografía del diseño tiene ascendentes y descendentes más largos que SF Pro
Display. Se priorizó que los anchos calcen exacto, así el bloque ocupa el mismo
footprint que el arte.

`.oc-aniv2-stage` mantiene siempre el aspect ratio exacto del arte, así el diseño
nunca se deforma. Hasta ~1475 px llena el hero exacto; más ancho recorta
arriba/abajo (zona vacía del arte) hasta el factor 1.35, y recién ahí letterboxea.

---

## Convivencia con otros banners del carrusel

Dos cosas a respetar si se toca este CSS:

**1. El prefijo `oc-aniv2` no es decorativo.** El otro banner Aniversale de la
home usa `.oc-aniv`. Los dos `<style>` conviven en la misma página, así que si
este usara el mismo prefijo, su `.oc-aniv { position:absolute; left:27.3%;
transform:translate(-50%,-50%); font-size:var(--u) }` se le aplicaría también a
este y lo rompería.

**2. `.oc-hero-live` es UNO SOLO** y lo comparten todos los slides. Un
`.oc-hero-live:has(.oc-aniv2)` se aplica siempre, incluso con otro banner
activo, y pelea contra el CSS de los otros banners por el alto del hero. Por eso
la regla de acá solo fija el ratio cuando el Aniversale es el **único** banner
(`:not(.oc-hero-carousel)`). En carrusel no se toca nada compartido: el banner se
acomoda al alto que haya.

Si querés el hero con el ratio de este banner y varios banners activos, todos
tienen que declarar el mismo alto (o fijarlo una sola vez en `globals.css`); no
lo puede imponer un banner solo.

---

## Pendiente, ajeno a este banner

El `<style>` del banner **JBL** le impone `aspect-ratio: 1900 / 660` al hero
(500 px a 1440), y por eso el de **Día del Niño** —que mide 560— se corta 60 px
abajo. Comprobado sacando el Aniversale de la página. Sacándole esas dos líneas
al JBL, el hero vuelve al `min-height: 560px` de `globals.css` y entran los tres.

---

## Assets

En `public/oneclick/banners/aniversale/` quedaron los WebP originales
(`27-aniversale`, `fondo-desktop`, `fondo-mobile`). **El banner no los usa** —
son el respaldo del arte extraído del PDF, por si hace falta regenerar el data
URI o armar una variante.

## Datos del banner

- CTA → `https://oneclickstore.com/cumple-oneclick`
- Rojo del claim: `#d4182e` · píldora `#131313` con borde `#383838` · gris `#a1a1a1`
