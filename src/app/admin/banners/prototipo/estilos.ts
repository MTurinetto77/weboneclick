/** CSS del prototipo. Va inline en un <style> para no tocar globals.css. */
export const ESTILOS = `
.bp-root { --bp-borde:#e3e3e6; --bp-azul:#0071e3; font-size:14px; }
.bp-toolbar {
  display:flex; align-items:center; gap:.5rem; flex-wrap:wrap;
  padding:.6rem .75rem; border:1px solid var(--bp-borde); border-radius:12px;
  background:#fafafa; margin-bottom:.75rem;
}
.bp-toolbar select { height:32px; border-radius:8px; border:1px solid var(--bp-borde); padding:0 .4rem; background:#fff; }
.bp-sep { width:1px; height:22px; background:var(--bp-borde); }
.bp-spacer { flex:1; }
.bp-seg { display:inline-flex; border:1px solid var(--bp-borde); border-radius:8px; overflow:hidden; background:#fff; }
.bp-seg button { border:0; background:transparent; padding:.4rem .7rem; cursor:pointer; font-size:.85rem; }
.bp-seg button.on { background:var(--bp-azul); color:#fff; }
.bp-add {
  border:1px solid var(--bp-borde); background:#fff; border-radius:8px;
  padding:.35rem .6rem; cursor:pointer; font-size:.82rem; display:inline-flex; gap:.35rem; align-items:center;
}
.bp-add:hover { border-color:var(--bp-azul); color:var(--bp-azul); }
.bp-ghost { border:1px solid var(--bp-borde); background:#fff; border-radius:8px; padding:.35rem .6rem; cursor:pointer; font-size:.82rem; }
.bp-check { display:inline-flex; align-items:center; gap:.35rem; font-size:.82rem; cursor:pointer; }

.bp-cols { display:grid; grid-template-columns:minmax(0,1fr) 300px; gap:1rem; align-items:start; }
.bp-cols.solo { grid-template-columns:minmax(0,1fr); }
@media (max-width:1100px) { .bp-cols { grid-template-columns:1fr; } }

.bp-stage-wrap { min-width:0; }
.bp-medida {
  display:flex; align-items:center; gap:.6rem; flex-wrap:wrap;
  font-size:.75rem; color:#777; margin-bottom:.35rem;
}
.bp-medida b { color:#333; }
.bp-escala { color:#999; }
.bp-stage { width:100%; overflow:auto; padding-bottom:.35rem; }
.bp-scaler { position:relative; }
.bp-lienzo {
  /* hidden, igual que el HTML publicado: si algo se sale, se tiene que ver
     recortado ACÁ también. Con visible el editor mentía. */
  position:relative; transform-origin:top left; overflow:hidden;
  container-type:inline-size;
  background-size:cover; background-position:center; background-color:#1d1d1f;
  border-radius:8px; box-shadow:0 2px 14px rgba(0,0,0,.18); user-select:none;
}
.bp-lienzo.previa { cursor:default; }
.bp-sinfondo {
  position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
  display:flex; align-items:center; justify-content:center; gap:.4rem; z-index:6;
  color:#dcdcdf; font-size:15px; letter-spacing:.01em; cursor:pointer;
  background:rgba(255,255,255,.09); border:1px dashed rgba(255,255,255,.45);
  border-radius:12px; padding:.7rem 1.1rem; font-family:inherit;
}
.bp-sinfondo:hover { background:rgba(255,255,255,.16); border-color:#fff; color:#fff; }
.bp-el { cursor:grab; }
.bp-el:active { cursor:grabbing; }
.bp-el.sel { outline:2px solid var(--bp-azul); outline-offset:1px; }
.bp-img { width:100%; height:100%; object-fit:cover; border-radius:inherit; pointer-events:none; }
.bp-ph { color:#fff; opacity:.6; font-size:13px; }
.bp-edit { outline:2px dashed rgba(255,255,255,.7); padding:0 .15em; cursor:text; }

/* tiradores */
.bp-h {
  position:absolute; width:11px; height:11px; background:#fff; border:2px solid var(--bp-azul);
  border-radius:2px; z-index:20;
}
.bp-h-no { left:-6px;  top:-6px;  cursor:nwse-resize; }
.bp-h-n  { left:calc(50% - 5px); top:-6px; cursor:ns-resize; }
.bp-h-ne { right:-6px; top:-6px;  cursor:nesw-resize; }
.bp-h-e  { right:-6px; top:calc(50% - 5px); cursor:ew-resize; }
.bp-h-se { right:-6px; bottom:-6px; cursor:nwse-resize; }
.bp-h-s  { left:calc(50% - 5px); bottom:-6px; cursor:ns-resize; }
.bp-h-so { left:-6px;  bottom:-6px; cursor:nesw-resize; }
.bp-h-o  { left:-6px;  top:calc(50% - 5px); cursor:ew-resize; }
.bp-rot {
  position:absolute; left:calc(50% - 7px); top:-30px; width:14px; height:14px;
  border-radius:50%; background:#fff; border:2px solid var(--bp-azul); cursor:grab; z-index:20;
}
.bp-rot::after { content:""; position:absolute; left:5px; top:14px; width:2px; height:16px; background:var(--bp-azul); }
.bp-badge {
  position:absolute; left:0; top:-20px; background:#8a6d00; color:#fff;
  font-size:10px; padding:1px 6px; border-radius:4px; white-space:nowrap; z-index:20;
}
.bp-guia { position:absolute; background:#ff2d55; z-index:30; pointer-events:none; }
.bp-guia-v { top:0; bottom:0; width:1px; }
.bp-guia-h { left:0; right:0; height:1px; }

.bp-tip { font-size:.75rem; color:#777; margin:.5rem 0 0; }
.bp-json {
  margin-top:.75rem; max-height:320px; overflow:auto; background:#1d1d1f; color:#d6d6d6;
  padding:.75rem; border-radius:8px; font-size:.72rem; line-height:1.45;
}

/* panel */
.bp-panel { display:flex; flex-direction:column; gap:.75rem; }
/* el atributo hidden pierde contra display:flex si no se lo declara acá */
.bp-panel[hidden] { display:none; }
.bp-bloque { border:1px solid var(--bp-borde); border-radius:12px; padding:.75rem; background:#fff; }
.bp-bloque h3 { margin:0 0 .5rem; font-size:.85rem; text-transform:uppercase; letter-spacing:.04em; color:#555; display:flex; justify-content:space-between; align-items:center; }
.bp-tag { background:#eee; color:#555; font-size:.65rem; padding:2px 6px; border-radius:4px; text-transform:none; letter-spacing:0; }
.bp-bloque label { display:block; font-size:.75rem; color:#666; margin:.5rem 0 .2rem; }
.bp-bloque input[type=text], .bp-bloque input:not([type]), .bp-bloque textarea, .bp-bloque select {
  width:100%; border:1px solid var(--bp-borde); border-radius:8px; padding:.35rem .5rem; font-size:.82rem; background:#fff;
}
.bp-bloque input[type=range] { width:100%; }
.bp-bloque input[type=color] { width:100%; height:30px; padding:2px; border:1px solid var(--bp-borde); border-radius:8px; background:#fff; }
.bp-bloque input[type=number] { width:100%; border:1px solid var(--bp-borde); border-radius:8px; padding:.3rem .4rem; font-size:.8rem; }
.bp-bloque input[type=file] { font-size:.72rem; margin-top:.25rem; width:100%; }
.bp-fila { display:flex; gap:.5rem; }
.bp-fila > div { flex:1; min-width:0; }
.bp-nota { font-size:.72rem; color:#888; margin:.5rem 0 0; line-height:1.4; }
.bp-nota code { background:#f2f2f4; padding:1px 4px; border-radius:3px; font-size:.68rem; }
.bp-aviso {
  background:#fff8e1; border:1px solid #f0d99a; color:#7a5c00; font-size:.74rem;
  padding:.45rem .55rem; border-radius:8px; margin-bottom:.4rem; line-height:1.4;
}
.bp-aviso button { display:block; margin-top:.35rem; border:0; background:#7a5c00; color:#fff; border-radius:6px; padding:.25rem .5rem; cursor:pointer; font-size:.7rem; }
.bp-toggle { margin-top:.75rem; width:100%; text-align:left; border:0; background:#f4f4f6; border-radius:8px; padding:.4rem .55rem; cursor:pointer; font-size:.78rem; color:#444; }
.bp-avanzado { border-left:2px solid #eee; padding-left:.6rem; margin-top:.4rem; }
.bp-autos { display:flex; gap:.75rem; margin-top:.6rem; flex-wrap:wrap; }
.bp-acciones { display:flex; gap:.5rem; margin-top:.75rem; }
.bp-acciones button { flex:1; border:1px solid var(--bp-borde); background:#fff; border-radius:8px; padding:.4rem; cursor:pointer; font-size:.78rem; }
.bp-acciones .peligro { color:#c00; border-color:#f0c9c9; }

.bp-capas { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:2px; }
.bp-capas li { display:flex; align-items:center; gap:.25rem; border-radius:6px; }
.bp-capas li.on { background:#eaf3ff; }
.bp-capas li > button:first-child {
  flex:1; text-align:left; border:0; background:transparent; padding:.3rem .4rem; cursor:pointer;
  font-size:.78rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.bp-capas li span button { border:0; background:transparent; cursor:pointer; padding:.2rem .3rem; color:#888; }

/* rejilla de tercios y centro */
.bp-rejilla { position:absolute; inset:0; pointer-events:none; z-index:5; }
.bp-rejilla span { position:absolute; top:0; bottom:0; width:1px; background:rgba(255,255,255,.16); }
.bp-rejilla i { position:absolute; left:0; right:0; height:1px; background:rgba(255,255,255,.16); }
.bp-rejilla .c { background:rgba(255,255,255,.3); }

/* selectores tipo píldora (forma y estilo del botón) */
.bp-pills { display:flex; gap:.3rem; flex-wrap:wrap; margin-top:.15rem; }
.bp-pills button {
  border:1px solid var(--bp-borde); background:#fff; padding:.28rem .55rem;
  cursor:pointer; font-size:.72rem; border-radius:8px;
}
.bp-pills button.on { background:var(--bp-azul); color:#fff; border-color:var(--bp-azul); }

/* alineación y capas */
.bp-alinear { display:flex; gap:.25rem; flex-wrap:wrap; margin-top:.15rem; }
.bp-alinear button {
  flex:1; min-width:34px; border:1px solid var(--bp-borde); background:#fff;
  border-radius:8px; padding:.3rem .2rem; cursor:pointer; font-size:.78rem;
}
.bp-alinear button:hover { border-color:var(--bp-azul); color:var(--bp-azul); }

/* panel de código generado */
.bp-codigo { margin-top:.75rem; border:1px solid var(--bp-borde); border-radius:12px; padding:.75rem; background:#fff; }
.bp-codigo-head { display:flex; align-items:flex-start; gap:.6rem; flex-wrap:wrap; margin-bottom:.5rem; }
.bp-codigo-head b { font-size:.85rem; }
.bp-codigo-head > span { flex:1; min-width:220px; font-size:.74rem; color:#777; line-height:1.4; }
.bp-codigo-head code { background:#f2f2f4; padding:1px 4px; border-radius:3px; font-size:.7rem; }
.bp-codigo-head div { display:flex; gap:.4rem; }
.bp-codigo-head button { border:1px solid var(--bp-borde); background:#fff; border-radius:8px; padding:.3rem .6rem; cursor:pointer; font-size:.75rem; white-space:nowrap; }
.bp-codigo textarea {
  width:100%; background:#1d1d1f; color:#d6d6d6; border:0; border-radius:8px; padding:.7rem;
  font-family:ui-monospace, SFMono-Regular, Menlo, monospace; font-size:.72rem; line-height:1.45; resize:vertical;
}

/* aviso de modo mobile */
.bp-modo {
  margin:0 0 .75rem; padding:.5rem .7rem; border-radius:10px; font-size:.78rem; line-height:1.45;
  background:#fff8e1; border:1px solid #f0d99a; color:#6b5000;
}

/* marca de característica independizada en mobile */
.bp-ovr {
  margin-left:.35rem; border:0; background:#8a6d00; color:#fff; font-size:.6rem;
  padding:1px 5px; border-radius:4px; cursor:pointer; vertical-align:middle; letter-spacing:.02em;
}
.bp-ovr:hover { background:#c00; }
.bp-compartido {
  margin-left:.35rem; background:#e8eefc; color:#3a5a9b; font-size:.6rem;
  padding:1px 5px; border-radius:4px; vertical-align:middle;
}
.bp-badge.propio { background:#8a6d00; }
.bp-punto {
  display:inline-block; width:6px; height:6px; border-radius:50%;
  background:#8a6d00; margin-left:.35rem; vertical-align:middle;
}
.bp-aviso b { font-weight:700; }

.bp-codigo-head select { border:1px solid var(--bp-borde); border-radius:8px; padding:.3rem .4rem; font-size:.75rem; background:#fff; }
.bp-pasos { margin:.6rem 0 0; padding-left:1.2rem; font-size:.76rem; color:#555; line-height:1.6; }
.bp-pasos b { color:#111; }

/* panel de publicación */
.bp-publicar { border-color:#c9dcff; background:#f7faff; }
.bp-ancho { width:100%; margin-top:.35rem; }
.bp-activo { margin-top:.6rem; }
.bp-guardar {
  width:100%; margin-top:.7rem; border:0; border-radius:10px; padding:.6rem;
  background:var(--bp-azul); color:#fff; font-size:.9rem; font-weight:600; cursor:pointer;
}
.bp-guardar:hover:not(:disabled) { background:#0060c0; }
.bp-guardar:disabled { background:#9dc3ee; cursor:progress; }
.bp-resultado {
  margin:.6rem 0 0; padding:.5rem .6rem; border-radius:8px; font-size:.75rem; line-height:1.45;
}
.bp-resultado.ok { background:#e7f6ec; border:1px solid #b6e0c4; color:#1c6b39; }
.bp-resultado.error { background:#fdeaea; border:1px solid #f0bcbc; color:#a11; }
.bp-resultado button {
  display:block; margin-top:.4rem; border:0; background:#1c6b39; color:#fff;
  border-radius:6px; padding:.25rem .6rem; cursor:pointer; font-size:.7rem;
}

/* miniaturas de fondo */
.bp-miniatura { position:relative; margin:.25rem 0 .4rem; }
.bp-miniatura img {
  width:100%; height:74px; object-fit:cover; border-radius:8px; display:block;
  border:1px solid var(--bp-borde); background:#f2f2f4;
}
.bp-miniatura button {
  position:absolute; right:.35rem; top:.35rem; border:0; background:rgba(0,0,0,.65);
  color:#fff; border-radius:6px; padding:.15rem .45rem; font-size:.66rem; cursor:pointer;
}
.bp-miniatura button:hover { background:#c00; }
.bp-subir {
  width:100%; border:1px dashed var(--bp-borde); background:#fafafa; border-radius:8px;
  padding:.45rem; cursor:pointer; font-size:.78rem; color:#444; margin-bottom:.3rem;
}
.bp-subir:hover { border-color:var(--bp-azul); color:var(--bp-azul); background:#f4f8ff; }

/* control de zoom */
.bp-zoom { display:inline-flex; border:1px solid var(--bp-borde); border-radius:8px; overflow:hidden; background:#fff; }
.bp-zoom button {
  border:0; background:transparent; padding:.25rem .55rem; cursor:pointer;
  font-size:.72rem; color:#555; border-right:1px solid var(--bp-borde);
}
.bp-zoom button:last-child { border-right:0; }
.bp-zoom button.on { background:var(--bp-azul); color:#fff; }
.bp-medida .bp-ghost { padding:.25rem .5rem; font-size:.72rem; }

.bp-bleed-info {
  background:#eef3fb; color:#3a5a9b; border-radius:5px; padding:1px 6px; font-size:.7rem;
}
.bp-etiqueta-zona {
  position:absolute; left:0; top:-18px; font-size:10px; color:rgba(255,255,255,.7);
  background:rgba(0,0,0,.45); padding:1px 6px; border-radius:4px; white-space:nowrap; z-index:31;
}

.bp-desborde {
  margin:.5rem 0 0; padding:.5rem .65rem; border-radius:8px; font-size:.76rem; line-height:1.45;
  background:#fff8e1; border:1px solid #f0d99a; color:#7a5c00;
}
.bp-desborde button {
  margin-left:.5rem; border:0; background:#7a5c00; color:#fff; border-radius:6px;
  padding:.2rem .55rem; cursor:pointer; font-size:.7rem;
}
`;
