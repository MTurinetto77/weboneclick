import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guard";
import { createMenuItem } from "../actions";

export default async function AdminMenuNuevoPage() {
  await requireAdmin();

  return (
    <div>
      <Link href="/admin/menu" style={{ fontSize: "0.85rem" }}>
        ← Menú principal
      </Link>

      <h1 style={{ marginTop: "0.5rem", marginBottom: "0.75rem" }}>Nuevo item de menú</h1>

      <form action={createMenuItem} style={{ maxWidth: 520 }}>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          Label
          <input
            type="text"
            name="label"
            required
            className="input"
            style={{ width: "100%", marginTop: "0.2rem" }}
            placeholder="ej. Mac"
          />
        </label>

        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          Href
          <input
            type="text"
            name="href"
            required
            className="input"
            style={{ width: "100%", marginTop: "0.2rem" }}
            placeholder="ej. /mac"
          />
        </label>

        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          Shop label (CTA del panel)
          <input
            type="text"
            name="shop_label"
            className="input"
            style={{ width: "100%", marginTop: "0.2rem" }}
            placeholder="ej. Shop Mac →"
          />
        </label>

        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          Badge (tag amarillo)
          <input
            type="text"
            name="badge"
            className="input"
            style={{ width: "100%", marginTop: "0.2rem" }}
            placeholder="ej. Nuevas"
          />
        </label>

        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          Tipo
          <select
            name="tipo"
            defaultValue="dinamico"
            className="input"
            style={{ width: "100%", marginTop: "0.2rem" }}
          >
            <option value="dinamico">Dinámico</option>
            <option value="fijo">Fijo</option>
          </select>
        </label>

        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          Dynamic children
          <input
            type="text"
            name="dynamic_children"
            className="input"
            style={{ width: "100%", marginTop: "0.2rem" }}
            placeholder='vacío o "promociones"'
          />
        </label>

        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          Orden
          <input
            type="number"
            name="orden"
            defaultValue={100}
            className="input"
            style={{ width: "100%", marginTop: "0.2rem" }}
          />
        </label>

        <button type="submit" className="btn btn-primary">
          Crear
        </button>
      </form>
    </div>
  );
}
