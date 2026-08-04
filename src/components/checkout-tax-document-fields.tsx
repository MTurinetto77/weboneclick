"use client";

import { useId, useRef, useState } from "react";

type Props = {
  defaultResponsabilidad?: string | null;
  defaultTipoDocumento?: string | null;
  defaultNumeroDocumento?: string | null;
};

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function CheckoutTaxDocumentFields({
  defaultResponsabilidad,
  defaultTipoDocumento,
  defaultNumeroDocumento,
}: Props) {
  const hintId = useId();
  const numeroRef = useRef<HTMLInputElement>(null);
  const initialResp =
    defaultResponsabilidad?.toUpperCase() === "RI" ? "RI" : "CF";
  const initialTipo =
    defaultTipoDocumento?.toUpperCase() === "CUIT" ? "CUIT" : "DNI";

  const [responsabilidad, setResponsabilidad] = useState<"CF" | "RI">(
    initialResp,
  );
  const [tipoDocumento, setTipoDocumento] = useState<"DNI" | "CUIT">(
    initialResp === "RI" ? "CUIT" : initialTipo,
  );
  const [numeroDocumento, setNumeroDocumento] = useState(
    defaultNumeroDocumento ?? "",
  );

  const isRi = responsabilidad === "RI";
  const cuitDigits = digitsOnly(numeroDocumento);
  const cuitOk = cuitDigits.length === 11;

  function validateCuitInput(
    input: HTMLInputElement,
    asRi: boolean = isRi,
  ) {
    if (!asRi) {
      input.setCustomValidity("");
      return;
    }
    if (digitsOnly(input.value).length !== 11) {
      input.setCustomValidity("Ingresá un CUIT de 11 dígitos");
    } else {
      input.setCustomValidity("");
    }
  }

  return (
    <>
      <div className="oc-checkout-field">
        <label>
          Responsabilidad impositiva <abbr title="obligatorio">*</abbr>
        </label>
        <select
          name="responsabilidad_impositiva"
          required
          value={responsabilidad}
          onChange={(e) => {
            const next = e.target.value === "RI" ? "RI" : "CF";
            setResponsabilidad(next);
            setTipoDocumento(next === "RI" ? "CUIT" : initialTipo);
            if (numeroRef.current) {
              validateCuitInput(numeroRef.current, next === "RI");
            }
          }}
        >
          <option value="CF">Consumidor Final</option>
          <option value="RI">IVA responsable inscripto</option>
        </select>
      </div>

      <div className="oc-checkout-grid-2">
        <div className="oc-checkout-field">
          <label>Tipo de documento</label>
          {isRi ? (
            <>
              <input type="hidden" name="tipo_documento" value="CUIT" />
              <select disabled value="CUIT" aria-label="Tipo de documento">
                <option value="CUIT">CUIT</option>
              </select>
            </>
          ) : (
            <select
              name="tipo_documento"
              value={tipoDocumento}
              onChange={(e) =>
                setTipoDocumento(e.target.value === "CUIT" ? "CUIT" : "DNI")
              }
            >
              <option value="DNI">DNI</option>
              <option value="CUIT">CUIT</option>
            </select>
          )}
        </div>
        <div className="oc-checkout-field">
          <label>
            Número de documento
            {isRi ? (
              <>
                {" "}
                <abbr title="obligatorio">*</abbr>
              </>
            ) : null}
          </label>
          <input
            ref={numeroRef}
            name="numero_documento"
            value={numeroDocumento}
            required={isRi}
            inputMode="numeric"
            autoComplete="off"
            aria-describedby={isRi ? hintId : undefined}
            aria-invalid={isRi && numeroDocumento.length > 0 && !cuitOk}
            placeholder={isRi ? "11 dígitos" : undefined}
            onChange={(e) => {
              setNumeroDocumento(e.target.value);
              validateCuitInput(e.target);
            }}
            onBlur={(e) => validateCuitInput(e.target)}
            onInvalid={(e) => validateCuitInput(e.currentTarget)}
          />
          {isRi ? (
            <p id={hintId} className="oc-checkout-field-hint">
              CUIT de 11 dígitos (podés usar guiones)
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
}
