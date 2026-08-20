"use client";

import dynamic from "next/dynamic";

/**
 * El editor usa localStorage y medidas del DOM, así que no tiene sentido
 * prerenderizarlo. `ssr: false` solo se permite dentro de un Client Component
 * (ver docs de Next 16: guides/lazy-loading → "Skipping SSR").
 */
const BannerEditorPrototipo = dynamic(
  () => import("./editor").then((m) => m.BannerEditorPrototipo),
  {
    ssr: false,
    loading: () => <p className="muted">Cargando editor…</p>,
  },
);

export function EditorClientOnly() {
  return <BannerEditorPrototipo />;
}
