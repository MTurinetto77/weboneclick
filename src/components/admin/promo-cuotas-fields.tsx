"use client";

import { useState } from "react";

export function PromoCuotasFields({
  defaultPorCuotas,
  defaultCuotas,
}: {
  defaultPorCuotas: boolean;
  defaultCuotas: number | null;
}) {
  const [porCuotas, setPorCuotas] = useState(defaultPorCuotas);

  return (
    <div className="admin-edit-inline" style={{ marginTop: "0.35rem" }}>
      <div className="form-field form-field-check" style={{ flex: "0 0 auto" }}>
        <label>
          <input
            type="checkbox"
            name="por_cuotas"
            checked={porCuotas}
            onChange={(e) => setPorCuotas(e.target.checked)}
          />{" "}
          Añadir productos por cuotas
        </label>
      </div>
      {porCuotas ? (
        <div className="form-field" style={{ flex: "0 1 8rem" }}>
          <label>Cantidad de cuotas</label>
          <input
            name="cuotas"
            type="number"
            min={1}
            step={1}
            required
            defaultValue={defaultCuotas ?? ""}
            placeholder="ej. 12"
          />
        </div>
      ) : null}
    </div>
  );
}
