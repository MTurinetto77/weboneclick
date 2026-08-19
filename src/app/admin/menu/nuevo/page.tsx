import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guard";
import { createMenuItem } from "../actions";
import { MenuItemModal } from "../menu-item-modal";

export default async function AdminMenuNuevoPage() {
  await requireAdmin();

  return (
    <div>
      <Link href="/admin/menu" style={{ fontSize: "0.85rem" }}>
        ← Menú principal
      </Link>

      <h1 style={{ marginTop: "0.5rem", marginBottom: "0.75rem" }}>Nuevo item de menú</h1>

      <p style={{ color: "#666", fontSize: "0.9rem" }}>
        Usa el botón para abrir el formulario de creación.
      </p>

      <MenuItemModal
        kind="item"
        data={null}
        action={createMenuItem as never}
        trigger={<span className="btn btn-primary">+ Crear item</span>}
      />
    </div>
  );
}
