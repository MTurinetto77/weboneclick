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

type TiendaDisponible = {
  id_tienda: number;
  nombre: string;
  slug: string;
  direccion: string;
  localidad: string;
  provincia: string;
  horarios: string | null;
  odoo_warehouse_id: number | null;
  disponible: boolean;
};

type Props = {
  onlineNote?: ReactNode;
  addressDefaults?: AddressDefaults | null;
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

function AddressFields({
  prefix,
  defaults,
  localidad,
  onLocalidadChange,
  includeCodigoPostal = true,
  provinciaDefault,
}: {
  prefix: string;
  defaults?: AddressDefaults | null;
  localidad?: string;
  onLocalidadChange?: (v: string) => void;
  includeCodigoPostal?: boolean;
  provinciaDefault: string;
}) {
  const name = (field: string) => (prefix ? `${prefix}_${field}` : field);
  const locControlled = onLocalidadChange != null;

  return (
    <>
      <div className="oc-checkout-field">
        <label>
          Calle <abbr title="obligatorio">*</abbr>
        </label>
        <input name={name("calle")} required defaultValue={defaults?.calle ?? ""} />
      </div>
      <div className="oc-checkout-grid-2">
        <div className="oc-checkout-field">
          <label>
            Número <abbr title="obligatorio">*</abbr>
          </label>
          <input name={name("numero")} required defaultValue={defaults?.numero ?? ""} />
        </div>
        <div className="oc-checkout-field">
          <label>Piso</label>
          <input name={name("piso")} defaultValue={defaults?.piso ?? ""} />
        </div>
        <div className="oc-checkout-field">
          <label>Departamento</label>
          <input name={name("departamento")} defaultValue={defaults?.departamento ?? ""} />
        </div>
        {includeCodigoPostal && (
          <div className="oc-checkout-field">
            <label>Código postal</label>
            <input
              name={name("codigo_postal")}
              defaultValue={defaults?.codigo_postal ?? ""}
            />
          </div>
        )}
      </div>
      <div className="oc-checkout-field">
        <label>Barrio</label>
        <input name={name("barrio")} defaultValue={defaults?.barrio ?? ""} />
      </div>
      <div className="oc-checkout-grid-2">
        <div className="oc-checkout-field">
          <label>
            Localidad <abbr title="obligatorio">*</abbr>
          </label>
          {locControlled ? (
            <input
              name={name("localidad")}
              required
              value={localidad ?? ""}
              onChange={(e) => onLocalidadChange?.(e.target.value)}
            />
          ) : (
            <input
              name={name("localidad")}
              required
              defaultValue={defaults?.localidad ?? ""}
            />
          )}
        </div>
        <div className="oc-checkout-field">
          <label>
            Provincia <abbr title="obligatorio">*</abbr>
          </label>
          <select name={name("provincia")} required defaultValue={provinciaDefault}>
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
        <input name={name("pais")} defaultValue={defaults?.pais || "Argentina"} />
      </div>
      <div className="oc-checkout-field">
        <label>Referencias</label>
        <input
          name={name("referencias")}
          placeholder="Entre calles, portería, etc."
          defaultValue={defaults?.referencias ?? ""}
        />
      </div>
    </>
  );
}

function CollapsiblePanel({
  title,
  open,
  onToggle,
  children,
  collapsible,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  collapsible: boolean;
}) {
  if (!collapsible) {
    return (
      <div className="oc-checkout-address-panel">
        <h3>{title}</h3>
        {children}
      </div>
    );
  }

  return (
    <div className={`oc-checkout-address-panel is-collapsible${open ? " is-open" : ""}`}>
      <button type="button" className="oc-checkout-panel-toggle" onClick={onToggle}>
        <span>{title}</span>
        <span className="oc-checkout-panel-caret" aria-hidden>
          {open ? "−" : "+"}
        </span>
      </button>
      {open && <div className="oc-checkout-panel-body">{children}</div>}
    </div>
  );
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
  const [otraPersona, setOtraPersona] = useState(false);
  const [mismaFacturacion, setMismaFacturacion] = useState(true);
  const [openEntrega, setOpenEntrega] = useState(true);
  const [openFacturacion, setOpenFacturacion] = useState(true);
  const [tiendas, setTiendas] = useState<TiendaDisponible[]>([]);
  const [tiendasLoading, setTiendasLoading] = useState(false);
  const [tiendaSeleccionada, setTiendaSeleccionada] = useState("");
  const [ningunaTienda, setNingunaTienda] = useState(false);
  const provinciaDefault = matchProvincia(addressDefaults?.provincia);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const showEntrega = tipoEntrega === "envio";
  const showFacturacionSeparada =
    tipoEntrega === "retiro" || (tipoEntrega === "envio" && !mismaFacturacion);
  const twoPanels = showEntrega && showFacturacionSeparada;

  useEffect(() => {
    if (twoPanels) {
      setOpenEntrega(true);
      setOpenFacturacion(false);
    } else {
      setOpenEntrega(true);
      setOpenFacturacion(true);
    }
  }, [twoPanels]);

  useEffect(() => {
    if (tipoEntrega !== "retiro") return;
    let cancelled = false;
    setTiendasLoading(true);
    fetch("/api/checkout/tiendas-disponibles")
      .then((res) => res.json())
      .then(
        (data: {
          tiendas: TiendaDisponible[];
          disponibles: TiendaDisponible[];
          ningunaDisponible: boolean;
        }) => {
          if (cancelled) return;
          setTiendas(data.tiendas ?? []);
          setNingunaTienda(Boolean(data.ningunaDisponible));
          const first = data.disponibles?.[0];
          if (first) {
            setTiendaSeleccionada(String(first.id_tienda));
          } else {
            setTiendaSeleccionada("");
          }
        }
      )
      .catch(() => {
        if (!cancelled) setNingunaTienda(true);
      })
      .finally(() => {
        if (!cancelled) setTiendasLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tipoEntrega, cartSubtotal]);

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
    if (next === "envio") setMismaFacturacion(true);
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
                <span
                  className="oc-checkout-cp-check"
                  aria-label="Código postal válido"
                  title="Código postal válido"
                >
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

      <div className="oc-checkout-otra-persona">
        <label className="oc-checkout-check">
          <input
            type="checkbox"
            name="receptor_otra_persona"
            value="1"
            checked={otraPersona}
            onChange={(e) => setOtraPersona(e.target.checked)}
          />
          <span>
            <strong>¿Retira o recibe otra persona?</strong>{" "}
            <span className="oc-checkout-optional">(opcional)</span>
          </span>
        </label>

        {otraPersona && (
          <div className="oc-checkout-grid-2 oc-checkout-otra-persona-fields">
            <div className="oc-checkout-field">
              <label>
                Nombre y Apellido <abbr title="obligatorio">*</abbr>
              </label>
              <input name="receptor_nombre" required maxLength={200} />
            </div>
            <div className="oc-checkout-field">
              <label>
                DNI de la persona que retira/recibe <abbr title="obligatorio">*</abbr>
              </label>
              <input name="receptor_dni" required inputMode="numeric" maxLength={50} />
            </div>
          </div>
        )}
      </div>

      {tipoEntrega === "envio" && (
        <div className="oc-checkout-misma-facturacion">
          <label className="oc-checkout-check">
            <input
              type="checkbox"
              name="misma_direccion_facturacion"
              value="1"
              checked={mismaFacturacion}
              onChange={(e) => setMismaFacturacion(e.target.checked)}
            />
            <span>
              <strong>Misma dirección de facturación</strong>
            </span>
          </label>
        </div>
      )}

      {showEntrega && (
        <CollapsiblePanel
          title="Dirección de entrega"
          open={openEntrega}
          onToggle={() => setOpenEntrega((v) => !v)}
          collapsible={twoPanels}
        >
          <AddressFields
            prefix=""
            defaults={addressDefaults}
            localidad={localidad}
            onLocalidadChange={setLocalidad}
            includeCodigoPostal={false}
            provinciaDefault={provinciaDefault}
          />
          {onlineNote}
        </CollapsiblePanel>
      )}

      {showFacturacionSeparada && (
        <CollapsiblePanel
          title="Dirección de facturación"
          open={openFacturacion}
          onToggle={() => setOpenFacturacion((v) => !v)}
          collapsible={twoPanels}
        >
          <AddressFields
            prefix="fact"
            defaults={tipoEntrega === "retiro" ? addressDefaults : null}
            includeCodigoPostal
            provinciaDefault={
              tipoEntrega === "retiro" ? provinciaDefault : ""
            }
          />
        </CollapsiblePanel>
      )}

      {tipoEntrega === "retiro" && (
        <div className="oc-checkout-tienda-retiro">
          <div className="oc-checkout-field">
            <label>
              Tienda de retiro <abbr title="obligatorio">*</abbr>
            </label>
            {tiendasLoading ? (
              <p className="oc-checkout-cp-msg">Cargando tiendas…</p>
            ) : ningunaTienda ? (
              <p className="oc-checkout-cp-msg is-error">
                Ninguna tienda tiene stock completo de tu carrito. Probá con envío a
                domicilio.
              </p>
            ) : (
              <select
                name="tienda_retiro"
                required
                value={tiendaSeleccionada}
                onChange={(e) => setTiendaSeleccionada(e.target.value)}
              >
                <option value="" disabled>
                  Seleccioná una tienda
                </option>
                {tiendas
                  .filter((t) => t.disponible)
                  .map((t) => (
                    <option key={t.id_tienda} value={t.id_tienda}>
                      {t.nombre} — {t.direccion}, {t.localidad}
                    </option>
                  ))}
              </select>
            )}
          </div>
          {tiendaSeleccionada && (
            <div className="oc-checkout-note">
              {(() => {
                const t = tiendas.find(
                  (x) => String(x.id_tienda) === tiendaSeleccionada
                );
                if (!t) return null;
                return (
                  <>
                    <strong>{t.nombre}</strong>
                    <br />
                    {t.direccion}, {t.localidad}, {t.provincia}
                    {t.horarios && (
                      <>
                        <br />
                        <span className="muted">{t.horarios}</span>
                      </>
                    )}
                  </>
                );
              })()}
              {onlineNote}
            </div>
          )}
        </div>
      )}
    </>
  );
}
