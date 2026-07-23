"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  SHIPPING_QUOTE_EVENT,
  type ShippingQuoteDetail,
} from "@/lib/shipping-quote";

const PROVINCIAS_AR = [
  "Buenos Aires",
  "Ciudad Autónoma de Buenos Aires (CABA)",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego, Antártida e Islas del Atlántico Sur",
  "Tucumán",
] as const;

export type AddressDefaults = {
  calle?: string;
  numero?: string;
  piso?: string | null;
  departamento?: string | null;
  barrio?: string | null;
  localidad?: string;
  provincia?: string;
  pais?: string | null;
  codigo_postal?: string | null;
  referencias?: string | null;
};

type Props = {
  onlineNote?: ReactNode;
  addressDefaults?: AddressDefaults | null;
  /** Subtotal del carrito para evaluar envío gratis */
  cartSubtotal: number;
};

function matchProvincia(raw?: string | null): string {
  if (!raw) return "";
  const value = raw.trim();
  if ((PROVINCIAS_AR as readonly string[]).includes(value)) return value;

  const normalized = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (
    normalized.includes("caba") ||
    normalized.includes("capital federal") ||
    normalized === "ciudad de buenos aires" ||
    normalized === "ciudad autonoma de buenos aires"
  ) {
    return "Ciudad Autónoma de Buenos Aires (CABA)";
  }

  const found = PROVINCIAS_AR.find((p) => {
    const pn = p
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return pn === normalized || pn.includes(normalized) || normalized.includes(pn);
  });
  return found ?? "";
}

function emitQuote(detail: ShippingQuoteDetail) {
  window.dispatchEvent(new CustomEvent(SHIPPING_QUOTE_EVENT, { detail }));
}

export function CheckoutDeliveryFields({
  onlineNote,
  addressDefaults,
  cartSubtotal,
}: Props) {
  const [tipoEntrega, setTipoEntrega] = useState<"envio" | "retiro">("envio");
  const [cp, setCp] = useState(addressDefaults?.codigo_postal ?? "");
  const [localidad, setLocalidad] = useState(addressDefaults?.localidad ?? "");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");
  const provinciaDefault = matchProvincia(addressDefaults?.provincia);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const validateCp = useCallback(
    async (value: string, tipo: "envio" | "retiro") => {
      if (tipo === "retiro") {
        setStatus("idle");
        setMessage("");
        emitQuote({
          tipo: "retiro",
          codigo_postal: value.trim(),
          ok: true,
          costo: 0,
          gratis: true,
          message: "Retiro en tienda",
        });
        return;
      }

      const codigo = value.trim();
      if (!codigo) {
        setStatus("idle");
        setMessage("");
        emitQuote({
          tipo: "envio",
          codigo_postal: "",
          ok: false,
          costo: 0,
          gratis: false,
          message: "Ingresá el código postal",
        });
        return;
      }

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setStatus("loading");
      setMessage("Validando…");

      try {
        const url = `/api/checkout/codigo-postal?cp=${encodeURIComponent(codigo)}&subtotal=${encodeURIComponent(String(cartSubtotal))}`;
        const res = await fetch(url, { signal: ac.signal });
        const data = (await res.json()) as {
          ok: boolean;
          codigo_postal: string;
          costo: number;
          gratis: boolean;
          message: string;
          localidad: string | null;
          proveedor: string | null;
          dias_entrega: number | null;
        };

        if (!data.ok) {
          setStatus("error");
          setMessage(data.message);
          emitQuote({
            tipo: "envio",
            codigo_postal: codigo,
            ok: false,
            costo: 0,
            gratis: false,
            message: data.message,
          });
          return;
        }

        setStatus("ok");
        setMessage(data.message);
        if (data.localidad && !localidad.trim()) {
          setLocalidad(data.localidad);
        }
        emitQuote({
          tipo: "envio",
          codigo_postal: data.codigo_postal || codigo,
          ok: true,
          costo: data.costo,
          gratis: data.gratis,
          message: data.message,
          localidad: data.localidad ?? undefined,
          proveedor: data.proveedor ?? undefined,
          dias_entrega: data.dias_entrega ?? undefined,
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setStatus("error");
        setMessage("No se pudo validar el código postal");
        emitQuote({
          tipo: "envio",
          codigo_postal: codigo,
          ok: false,
          costo: 0,
          gratis: false,
          message: "No se pudo validar el código postal",
        });
      }
    },
    [cartSubtotal, localidad],
  );

  useEffect(() => {
    void validateCp(cp, tipoEntrega);
    // Solo al montar / cambiar tipo o subtotal; el CP se valida con debounce al tipear
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoEntrega, cartSubtotal]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function onCpChange(value: string) {
    setCp(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void validateCp(value, tipoEntrega);
    }, 350);
  }

  function onTipoChange(next: "envio" | "retiro") {
    setTipoEntrega(next);
  }

  return (
    <>
      <fieldset className="oc-checkout-fieldset">
        <legend>Tipo de entrega</legend>

        <div className="oc-checkout-entrega-row">
          <label className="oc-checkout-radio">
            <input
              type="radio"
              name="tipo_entrega"
              value="envio"
              checked={tipoEntrega === "envio"}
              onChange={() => onTipoChange("envio")}
            />
            Envío a domicilio
          </label>

          {tipoEntrega === "envio" && (
            <div className="oc-checkout-cp-box">
              <label htmlFor="checkout-cp">Código postal</label>
              <input
                id="checkout-cp"
                name="codigo_postal"
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="Ej. 1001"
                required
                value={cp}
                onChange={(e) => onCpChange(e.target.value)}
                onBlur={() => void validateCp(cp, "envio")}
              />
              {status === "ok" && (
                <span className="oc-checkout-cp-check" aria-label="Código postal válido" title="Código postal válido">
                  ✓
                </span>
              )}
            </div>
          )}
        </div>

        {tipoEntrega === "envio" && status === "error" && message && (
          <p className="oc-checkout-cp-msg is-error">{message}</p>
        )}
        {tipoEntrega === "envio" && status === "loading" && (
          <p className="oc-checkout-cp-msg">Validando…</p>
        )}

        <label className="oc-checkout-radio">
          <input
            type="radio"
            name="tipo_entrega"
            value="retiro"
            checked={tipoEntrega === "retiro"}
            onChange={() => onTipoChange("retiro")}
          />
          Retiro en tienda
        </label>
      </fieldset>

      {tipoEntrega === "envio" && (
        <div className="oc-checkout-address">
          <h3>Dirección de entrega</h3>
          <div className="oc-checkout-field">
            <label>Calle *</label>
            <input name="calle" required defaultValue={addressDefaults?.calle ?? ""} />
          </div>
          <div className="oc-checkout-grid-2">
            <div className="oc-checkout-field">
              <label>Número *</label>
              <input name="numero" required defaultValue={addressDefaults?.numero ?? ""} />
            </div>
            <div className="oc-checkout-field">
              <label>Piso</label>
              <input name="piso" defaultValue={addressDefaults?.piso ?? ""} />
            </div>
            <div className="oc-checkout-field">
              <label>Departamento</label>
              <input name="departamento" defaultValue={addressDefaults?.departamento ?? ""} />
            </div>
          </div>
          <div className="oc-checkout-field">
            <label>Barrio</label>
            <input name="barrio" defaultValue={addressDefaults?.barrio ?? ""} />
          </div>
          <div className="oc-checkout-grid-2">
            <div className="oc-checkout-field">
              <label>Localidad *</label>
              <input
                name="localidad"
                required
                value={localidad}
                onChange={(e) => setLocalidad(e.target.value)}
              />
            </div>
            <div className="oc-checkout-field">
              <label>Provincia *</label>
              <select name="provincia" required defaultValue={provinciaDefault}>
                <option value="" disabled>
                  Seleccioná una provincia
                </option>
                {PROVINCIAS_AR.map((provincia) => (
                  <option key={provincia} value={provincia}>
                    {provincia}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="oc-checkout-field">
            <label>País</label>
            <input name="pais" defaultValue={addressDefaults?.pais || "Argentina"} />
          </div>
          <div className="oc-checkout-field">
            <label>Referencias</label>
            <input
              name="referencias"
              placeholder="Entre calles, portería, etc."
              defaultValue={addressDefaults?.referencias ?? ""}
            />
          </div>
          {onlineNote}
        </div>
      )}

      {tipoEntrega === "retiro" && (
        <div className="oc-checkout-note">
          Seleccionarás la tienda de retiro después de confirmar el pago.
          {onlineNote}
        </div>
      )}
    </>
  );
}
