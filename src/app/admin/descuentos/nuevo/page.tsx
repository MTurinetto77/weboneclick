import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guard";
import { generarCupones } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminNuevoDescuentoPage() {
  await requireAdmin();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 30);
  const defaultVigencia = tomorrow.toISOString().slice(0, 10);

  return (
    <div>
      <p>
        <Link href="/admin/descuentos">← Descuentos</Link>
      </p>
      <h1 style={{ marginTop: 0 }}>Generar cupones</h1>
      <p className="muted" style={{ marginTop: 0, fontSize: "0.85rem" }}>
        Se generarán códigos con el prefijo indicado + 10 caracteres alfanuméricos
        aleatorios (sin distinguir mayúsculas/minúsculas).
      </p>

      <div className="admin-card">
        <form action={generarCupones}>
          <div className="form-field">
            <label>Cantidad a generar</label>
            <input
              name="cantidad"
              type="number"
              min={1}
              max={5000}
              defaultValue={10}
              required
            />
          </div>
          <div className="form-field">
            <label>Comienzo del código (prefijo)</label>
            <input
              name="prefijo"
              required
              placeholder="EmpresaA-"
              maxLength={40}
            />
            <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.8rem" }}>
              Ejemplo: <code>EmpresaA-</code> → <code>EMPRESAA-A1B2C3D4E5</code>
            </p>
          </div>
          <div className="form-field">
            <label>Monto de descuento (ARS)</label>
            <input
              name="monto"
              type="number"
              min={1}
              step="0.01"
              required
              placeholder="5000"
            />
          </div>
          <div className="form-field">
            <label>Fecha de vigencia</label>
            <input
              name="fecha_vigencia"
              type="date"
              required
              defaultValue={defaultVigencia}
            />
            <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.8rem" }}>
              El cupón es válido hasta el final de ese día.
            </p>
          </div>
          <div className="form-field">
            <label>Grupo (opcional)</label>
            <input name="grupo" placeholder="Campaña abril / EmpresaA" maxLength={100} />
          </div>
          <button type="submit" className="btn btn-primary">
            Generar cupones
          </button>
        </form>
      </div>
    </div>
  );
}
