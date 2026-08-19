"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type CatOption = {
  id_categoria: number;
  nombre: string;
  slug: string;
};

/* ------------------------------------------------------------------ */
/*  Shared data shape for both items and sub-items                     */
/* ------------------------------------------------------------------ */

export type MenuItemData = {
  id?: number;
  label: string;
  href: string;
  id_categoria: number | null;
  shop_label?: string | null;
  badge?: string | null;
  icon?: string | null;
  variant?: string;
  tipo?: string;
  dynamic_children?: string | null;
  orden: number;
  activo: boolean;
};

type ModalProps = {
  /** "item" = menu_item principal, "child" = menu_item_hijo */
  kind: "item" | "child";
  /** For children: the parent menu_item id */
  parentId?: number;
  data: MenuItemData | null;
  action: (...args: unknown[]) => Promise<void>;
  trigger: React.ReactNode;
};

export function MenuItemModal({ kind, parentId, data, action, trigger }: ModalProps) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const isNew = data === null;

  const [cats, setCats] = useState<CatOption[]>([]);
  const [mode, setMode] = useState<"categoria" | "custom">(
    data?.id_categoria ? "categoria" : "custom",
  );
  const [selectedCat, setSelectedCat] = useState<number>(data?.id_categoria ?? 0);

  useEffect(() => {
    if (!open) return;
    fetch("/api/admin/categorias-menu")
      .then((r) => r.json())
      .then((d: CatOption[]) => setCats(d))
      .catch(() => {});
  }, [open]);

  function show() {
    setOpen(true);
    setTimeout(() => dialogRef.current?.showModal(), 0);
  }

  function close() {
    dialogRef.current?.close();
    setOpen(false);
  }

  async function handleSubmit(formData: FormData) {
    if (kind === "child" && parentId != null) {
      await (action as (parentId: number, fd: FormData) => Promise<void>)(parentId, formData);
    } else {
      await (action as (fd: FormData) => Promise<void>)(formData);
    }
    close();
    router.refresh();
  }

  const selectedCatObj = cats.find((c) => c.id_categoria === selectedCat);

  return (
    <>
      <span onClick={show} style={{ cursor: "pointer", display: "inline-flex" }}>
        {trigger}
      </span>
      {open && (
        <dialog
          ref={dialogRef}
          onClick={(e) => { if (e.target === dialogRef.current) close(); }}
          style={{ border: "1px solid #ccc", borderRadius: "8px", padding: 0, maxWidth: 500, width: "92vw" }}
        >
          <div style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0 }}>
                {isNew ? (kind === "item" ? "Nuevo item" : "Agregar sub-item") : `Editar: ${data.label}`}
              </h3>
              <button type="button" onClick={close} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer" }}>
                ✕
              </button>
            </div>

            <form action={handleSubmit}>
              {data?.id && kind === "child" && (
                <input type="hidden" name="id_menu_hijo" value={data.id} />
              )}

              <label style={{ display: "block", marginBottom: "0.5rem" }}>
                Label
                <input type="text" name="label" defaultValue={data?.label ?? ""} required className="input" style={{ width: "100%", marginTop: "0.2rem" }} />
              </label>

              {/* ---- Destino: categoría o URL custom ---- */}
              <fieldset style={{ border: "1px solid #ddd", padding: "0.75rem", borderRadius: "6px", marginBottom: "0.5rem" }}>
                <legend style={{ fontSize: "0.85rem", padding: "0 0.3rem" }}>Destino</legend>

                <div style={{ display: "flex", gap: "1rem", marginBottom: "0.5rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", cursor: "pointer" }}>
                    <input type="radio" checked={mode === "categoria"} onChange={() => setMode("categoria")} />
                    Categoría
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", cursor: "pointer" }}>
                    <input type="radio" checked={mode === "custom"} onChange={() => setMode("custom")} />
                    URL personalizada
                  </label>
                </div>

                {mode === "categoria" ? (
                  <div>
                    <select
                      className="input"
                      style={{ width: "100%", marginBottom: "0.4rem" }}
                      value={selectedCat}
                      onChange={(e) => setSelectedCat(Number(e.target.value))}
                    >
                      <option value={0}>— Seleccionar categoría —</option>
                      {cats.map((c) => (
                        <option key={c.id_categoria} value={c.id_categoria}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                    <input type="hidden" name="id_categoria" value={selectedCat || ""} />
                    <input type="hidden" name="href" value="" />
                    {selectedCatObj && (
                      <p style={{ margin: 0, fontSize: "0.8rem", color: "#666" }}>
                        Categoría: {selectedCatObj.nombre} — el href se genera automáticamente al guardar
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <input type="text" name="href" defaultValue={data?.href ?? ""} required className="input" style={{ width: "100%" }} placeholder="ej. /mac o /accesorios" />
                    <input type="hidden" name="id_categoria" value="" />
                  </div>
                )}
              </fieldset>

              {/* ---- Fields only for items (not children) ---- */}
              {kind === "item" && (
                <>
                  <label style={{ display: "block", marginBottom: "0.5rem" }}>
                    Shop label (CTA del panel)
                    <input type="text" name="shop_label" defaultValue={data?.shop_label ?? ""} className="input" style={{ width: "100%", marginTop: "0.2rem" }} placeholder="ej. Shop Mac →" />
                  </label>

                  {(!data || data.tipo !== "fijo") && (
                    <label style={{ display: "block", marginBottom: "0.5rem" }}>
                      Tipo
                      <select name="tipo" defaultValue={data?.tipo ?? "dinamico"} className="input" style={{ width: "100%", marginTop: "0.2rem" }}>
                        <option value="dinamico">Dinámico</option>
                        <option value="fijo">Fijo</option>
                      </select>
                    </label>
                  )}

                  <label style={{ display: "block", marginBottom: "0.5rem" }}>
                    Dynamic children
                    <input type="text" name="dynamic_children" defaultValue={data?.dynamic_children ?? ""} className="input" style={{ width: "100%", marginTop: "0.2rem" }} placeholder='vacío o "promociones"' />
                  </label>
                </>
              )}

              {/* ---- Common fields ---- */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem" }}>
                  Badge (tag amarillo)
                  <input type="text" name="badge" defaultValue={data?.badge ?? ""} className="input" style={{ width: "100%", marginTop: "0.2rem" }} placeholder="ej. Nuevas" />
                </label>
                <label style={{ display: "block", marginBottom: "0.5rem" }}>
                  Orden
                  <input type="number" name="orden" defaultValue={data?.orden ?? 10} className="input" style={{ width: "100%", marginTop: "0.2rem" }} />
                </label>
              </div>

              {kind === "child" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem" }}>
                    Icon
                    <input type="text" name="icon" defaultValue={data?.icon ?? ""} className="input" style={{ width: "100%", marginTop: "0.2rem" }} placeholder="emoji o ruta" />
                  </label>
                  <label style={{ display: "block", marginBottom: "0.5rem" }}>
                    Estilo
                    <select name="variant" defaultValue={data?.variant ?? "product"} className="input" style={{ width: "100%", marginTop: "0.2rem" }}>
                      <option value="product">Destacado</option>
                      <option value="link">Secundario</option>
                    </select>
                  </label>
                </div>
              )}

              <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.75rem" }}>
                <input type="checkbox" name="activo" defaultChecked={data?.activo ?? true} />
                Activo
              </label>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="submit" className="btn btn-primary">
                  {isNew ? "Crear" : "Guardar"}
                </button>
                <button type="button" onClick={close} className="btn">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}
    </>
  );
}
