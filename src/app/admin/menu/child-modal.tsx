"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ChildData = {
  id_menu_hijo: number;
  label: string;
  href: string;
  badge: string | null;
  icon: string | null;
  variant: string;
  orden: number;
  activo: boolean;
};

export function ChildEditModal({
  idMenuItem,
  child,
  upsertAction,
  trigger,
}: {
  idMenuItem: number;
  child: ChildData | null;
  upsertAction: (idMenuItem: number, formData: FormData) => Promise<void>;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const isNew = child === null;

  function show() {
    setOpen(true);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
    setOpen(false);
  }

  async function handleSubmit(formData: FormData) {
    await upsertAction(idMenuItem, formData);
    close();
    router.refresh();
  }

  return (
    <>
      <span onClick={show} style={{ cursor: "pointer", display: "inline-flex" }}>
        {trigger}
      </span>
      {open && (
        <dialog
          ref={dialogRef}
          onClick={(e) => { if (e.target === dialogRef.current) close(); }}
          style={{
            border: "1px solid #ccc",
            borderRadius: "8px",
            padding: 0,
            maxWidth: 460,
            width: "90vw",
          }}
        >
          <div style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0 }}>{isNew ? "Agregar sub-item" : `Editar: ${child.label}`}</h3>
              <button type="button" onClick={close} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>

            <form action={handleSubmit}>
              {child && <input type="hidden" name="id_menu_hijo" value={child.id_menu_hijo} />}

              <label style={{ display: "block", marginBottom: "0.5rem" }}>
                Label
                <input type="text" name="label" defaultValue={child?.label ?? ""} required className="input" style={{ width: "100%", marginTop: "0.2rem" }} />
              </label>

              <label style={{ display: "block", marginBottom: "0.5rem" }}>
                Href
                <input type="text" name="href" defaultValue={child?.href ?? ""} required className="input" style={{ width: "100%", marginTop: "0.2rem" }} />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem" }}>
                  Badge
                  <input type="text" name="badge" defaultValue={child?.badge ?? ""} className="input" style={{ width: "100%", marginTop: "0.2rem" }} placeholder="ej. Nuevas" />
                </label>

                <label style={{ display: "block", marginBottom: "0.5rem" }}>
                  Icon
                  <input type="text" name="icon" defaultValue={child?.icon ?? ""} className="input" style={{ width: "100%", marginTop: "0.2rem" }} placeholder="emoji o ruta" />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem" }}>
                  Variant
                  <select name="variant" defaultValue={child?.variant ?? "product"} className="input" style={{ width: "100%", marginTop: "0.2rem" }}>
                    <option value="product">product</option>
                    <option value="link">link</option>
                  </select>
                </label>

                <label style={{ display: "block", marginBottom: "0.5rem" }}>
                  Orden
                  <input type="number" name="orden" defaultValue={child?.orden ?? 10} className="input" style={{ width: "100%", marginTop: "0.2rem" }} />
                </label>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.75rem" }}>
                <input type="checkbox" name="activo" defaultChecked={child?.activo ?? true} />
                Activo
              </label>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="submit" className="btn btn-primary">
                  {isNew ? "Agregar" : "Guardar"}
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
