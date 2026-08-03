"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

export function ProductoSaveButton() {
  const { pending } = useFormStatus();
  const prevPending = useRef(false);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (prevPending.current && !pending) {
      setShowSaved(true);
      const id = window.setTimeout(() => setShowSaved(false), 3000);
      prevPending.current = pending;
      return () => window.clearTimeout(id);
    }
    prevPending.current = pending;
    if (pending) setShowSaved(false);
  }, [pending]);

  return (
    <div className="admin-save-row">
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </button>
      {showSaved ? <span className="admin-save-ok">Cambios guardados</span> : null}
    </div>
  );
}
