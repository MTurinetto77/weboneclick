import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guard";
import { EditorClientOnly } from "./montaje";

/** Evita prerender en build sin credenciales de DB. */
export const dynamic = "force-dynamic";

export default async function BannerPrototipoPage() {
  await requireAdmin();

  return (
    <div>
      <p>
        <Link href="/admin/banners">← Banners</Link>
      </p>
      <h1 style={{ marginTop: 0 }}>Prototipo · Editor visual de banners</h1>
      <p className="muted" style={{ maxWidth: "72ch", marginTop: "-.4rem" }}>
        Armá el banner arrastrando y guardalo con el botón <b>Publicar</b>: el diseño se escribe como
        HTML en el banner que elijas, así que la home lo renderiza igual que siempre. El editor de
        HTML a mano sigue disponible desde el listado y no se tocó.
      </p>
      <p className="muted" style={{ maxWidth: "72ch", fontSize: "0.85rem" }}>
        <b>Guardar reemplaza el HTML del banner de destino.</b> Para probar sin riesgo, creá uno
        nuevo y dejalo inactivo; después de guardar tenés un botón para deshacer el cambio.
      </p>
      <EditorClientOnly />
    </div>
  );
}
