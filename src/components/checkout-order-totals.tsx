"use client";

import { useEffect, useMemo, useState } from "react";
import {
  alignGrossesToOdooTotal,
  type AlignGrossItem,
} from "@/lib/odoo-amount";
import {
  getLastShippingQuote,
  SHIPPING_QUOTE_EVENT,
  type ShippingQuoteDetail,
} from "@/lib/shipping-quote";

function formatArs(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

type Props = {
  /** Líneas de cobro (tarjeta) con alícuota para alinear al redondeo Odoo. */
  items: AlignGrossItem[];
  iva105: number;
  iva21: number;
};

export function CheckoutEnvioTotalRows({ items, iva105, iva21 }: Props) {
  const [quote, setQuote] = useState<ShippingQuoteDetail>(() => {
    return (
      getLastShippingQuote() ?? {
        tipo: "envio",
        codigo_postal: "",
        ok: false,
        costo: 0,
        gratis: false,
        message: "Ingresá el código postal",
      }
    );
  });

  useEffect(() => {
    const last = getLastShippingQuote();
    if (last) setQuote(last);

    function onQuote(e: Event) {
      const detail = (e as CustomEvent<ShippingQuoteDetail>).detail;
      if (detail) setQuote(detail);
    }
    window.addEventListener(SHIPPING_QUOTE_EVENT, onQuote);
    return () => window.removeEventListener(SHIPPING_QUOTE_EVENT, onQuote);
  }, []);

  const shippingCost = quote.tipo === "retiro" ? 0 : quote.ok ? quote.costo : 0;
  const aligned = useMemo(
    () =>
      alignGrossesToOdooTotal({
        items,
        costo_envio: shippingCost,
      }),
    [items, shippingCost],
  );
  const total = aligned.total;
  const displayShipping = aligned.costo_envio;

  let envioLabel: string;
  if (quote.tipo === "retiro") {
    envioLabel = "Retiro en tienda";
  } else if (!quote.codigo_postal) {
    envioLabel = "Ingresá el código postal";
  } else if (!quote.ok) {
    envioLabel = quote.message;
  } else if (quote.gratis) {
    envioLabel = "Envío gratis";
  } else {
    envioLabel = formatArs(displayShipping);
  }

  return (
    <>
      <tr>
        <th>Envío</th>
        <td
          className={
            quote.tipo === "envio" && quote.codigo_postal && !quote.ok
              ? "oc-checkout-envio-error"
              : undefined
          }
        >
          {envioLabel}
        </td>
      </tr>
      <tr className="oc-checkout-total">
        <th>Total</th>
        <td>
          <strong>{formatArs(total)}</strong>
          {(iva105 > 0 || iva21 > 0) && (
            <span className="oc-cart-tax">
              (incluye
              {iva105 > 0 && <> {formatArs(iva105)} IVA 10.5%</>}
              {iva105 > 0 && iva21 > 0 && ","}
              {iva21 > 0 && <> {formatArs(iva21)} IVA 21%</>})
            </span>
          )}
        </td>
      </tr>
    </>
  );
}
