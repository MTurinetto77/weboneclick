"use client";

import { useState, type ReactNode } from "react";

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
};

export function CheckoutDeliveryFields({ onlineNote, addressDefaults }: Props) {
  const [tipoEntrega, setTipoEntrega] = useState<"envio" | "retiro">("envio");
  const [tipoPago, setTipoPago] = useState<"online" | "tienda">("online");
  const provinciaDefault =
    addressDefaults?.provincia &&
    (PROVINCIAS_AR as readonly string[]).includes(addressDefaults.provincia)
      ? addressDefaults.provincia
      : "";

  return (
    <>
      <fieldset className="checkout-fieldset">
        <legend>Tipo de entrega</legend>
        <label className="radio-row">
          <input
            type="radio"
            name="tipo_entrega"
            value="envio"
            checked={tipoEntrega === "envio"}
            onChange={() => {
              setTipoEntrega("envio");
              setTipoPago("online");
            }}
          />
          Envío a domicilio
        </label>
        <label className="radio-row">
          <input
            type="radio"
            name="tipo_entrega"
            value="retiro"
            checked={tipoEntrega === "retiro"}
            onChange={() => setTipoEntrega("retiro")}
          />
          Retiro en tienda
        </label>
      </fieldset>

      {tipoEntrega === "envio" && (
        <div className="checkout-address">
          <h3>Dirección de entrega</h3>
          <div className="form-field">
            <label>Calle *</label>
            <input name="calle" required defaultValue={addressDefaults?.calle ?? ""} />
          </div>
          <div className="form-grid-2">
            <div className="form-field">
              <label>Número *</label>
              <input name="numero" required defaultValue={addressDefaults?.numero ?? ""} />
            </div>
            <div className="form-field">
              <label>Piso</label>
              <input name="piso" defaultValue={addressDefaults?.piso ?? ""} />
            </div>
            <div className="form-field">
              <label>Departamento</label>
              <input name="departamento" defaultValue={addressDefaults?.departamento ?? ""} />
            </div>
            <div className="form-field">
              <label>Código postal</label>
              <input name="codigo_postal" defaultValue={addressDefaults?.codigo_postal ?? ""} />
            </div>
          </div>
          <div className="form-field">
            <label>Barrio</label>
            <input name="barrio" defaultValue={addressDefaults?.barrio ?? ""} />
          </div>
          <div className="form-grid-2">
            <div className="form-field">
              <label>Localidad *</label>
              <input name="localidad" required defaultValue={addressDefaults?.localidad ?? ""} />
            </div>
            <div className="form-field">
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
          <div className="form-field">
            <label>País</label>
            <input name="pais" defaultValue={addressDefaults?.pais || "Argentina"} />
          </div>
          <div className="form-field">
            <label>Referencias</label>
            <input
              name="referencias"
              placeholder="Entre calles, portería, etc."
              defaultValue={addressDefaults?.referencias ?? ""}
            />
          </div>
          <input type="hidden" name="tipo_pago" value="online" />
          {onlineNote}
        </div>
      )}

      {tipoEntrega === "retiro" && (
        <fieldset className="checkout-fieldset">
          <legend>Forma de pago</legend>
          <label className="radio-row">
            <input
              type="radio"
              name="tipo_pago"
              value="tienda"
              checked={tipoPago === "tienda"}
              onChange={() => setTipoPago("tienda")}
            />
            Pago en tienda
          </label>
          <label className="radio-row">
            <input
              type="radio"
              name="tipo_pago"
              value="online"
              checked={tipoPago === "online"}
              onChange={() => setTipoPago("online")}
            />
            Pago online
          </label>
          {tipoPago === "online" && onlineNote}
        </fieldset>
      )}
    </>
  );
}
