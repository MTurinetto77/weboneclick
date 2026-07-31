"use client";

import { useEffect, useRef, useState } from "react";
import {
  getLastShippingQuote,
  SHIPPING_QUOTE_EVENT,
  type ShippingQuoteDetail,
} from "@/lib/shipping-quote";

type Metodo = "tarjeta" | "mercado_pago";

type Props = {
  /** Total productos pagando con tarjeta (sin envío) */
  totalTarjeta: number;
  /** Total productos Mercado Pago contado (sin envío) */
  totalContado: number;
  /** Tope de cuotas del carrito (menor cuotas_max de los productos). */
  maxInstallments: number;
  mpConfigured: boolean;
  publicKey: string | null;
};

function formatArs(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function applyQuote(
  detail: ShippingQuoteDetail,
  setShippingCost: (n: number) => void,
  setShippingOk: (ok: boolean) => void,
  setDeliveryTipo: (t: "envio" | "retiro") => void,
) {
  setDeliveryTipo(detail.tipo);
  if (detail.tipo === "retiro") {
    setShippingCost(0);
    setShippingOk(true);
    return;
  }
  setShippingCost(detail.ok ? detail.costo : 0);
  setShippingOk(detail.ok);
}

export function CheckoutPaymentOptions({
  totalTarjeta,
  totalContado,
  maxInstallments,
  mpConfigured,
  publicKey,
}: Props) {
  const [metodo, setMetodo] = useState<Metodo>("tarjeta");
  const [error, setError] = useState<string | null>(null);
  const [shippingCost, setShippingCost] = useState(0);
  const [shippingOk, setShippingOk] = useState(false);
  const [deliveryTipo, setDeliveryTipo] = useState<"envio" | "retiro" | null>(
    null,
  );
  const wrapperRef = useRef<HTMLDivElement>(null);

  const brickEnabled = mpConfigured && !!publicKey;
  const payTarjeta = Math.round((totalTarjeta + shippingCost) * 100) / 100;
  const payContado = Math.round((totalContado + shippingCost) * 100) / 100;
  // Retiro no exige CP; envío sí necesita cotización ok.
  const canPayDelivery = deliveryTipo === "retiro" || shippingOk;
  const needsCpWarning = deliveryTipo !== "retiro" && !shippingOk;

  useEffect(() => {
    const last = getLastShippingQuote();
    if (last) {
      applyQuote(last, setShippingCost, setShippingOk, setDeliveryTipo);
    }

    function onQuote(e: Event) {
      const detail = (e as CustomEvent<ShippingQuoteDetail>).detail;
      if (!detail) return;
      applyQuote(detail, setShippingCost, setShippingOk, setDeliveryTipo);
    }
    window.addEventListener(SHIPPING_QUOTE_EVENT, onQuote);
    return () => window.removeEventListener(SHIPPING_QUOTE_EVENT, onQuote);
  }, []);

  async function payWithCard(cardData: unknown): Promise<void> {
    setError(null);
    const form = wrapperRef.current?.closest("form");
    if (!form) throw new Error("Formulario no encontrado");
    if (!form.reportValidity()) {
      throw new Error("Completá los datos de facturación");
    }

    const fields: Record<string, string> = {};
    for (const [key, value] of new FormData(form).entries()) {
      if (typeof value === "string") fields[key] = value;
    }

    const tipoEntrega = fields.tipo_entrega;
    if (tipoEntrega === "envio" && !shippingOk) {
      const message = "Ingresá un código postal con cobertura de envío";
      setError(message);
      throw new Error(message);
    }
    if (tipoEntrega === "retiro" && !fields.tienda_retiro) {
      const message = "Seleccioná la tienda de retiro";
      setError(message);
      throw new Error(message);
    }

    const res = await fetch("/api/mercadopago/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields, card: cardData }),
    });
    const data = (await res.json()) as { redirect?: string; error?: string };
    if (!res.ok || !data.redirect) {
      const message = data.error || "No pudimos procesar el pago";
      setError(message);
      throw new Error(message);
    }
    window.location.href = data.redirect;
  }

  return (
    <div className="oc-checkout-payment" ref={wrapperRef}>
      <h3>Medio de pago</h3>

      <label
        className={`oc-checkout-payment-option${metodo === "tarjeta" ? " is-active" : ""}`}
      >
        <input
          type="radio"
          name="tipo_pago"
          value="tarjeta"
          checked={metodo === "tarjeta"}
          onChange={() => setMetodo("tarjeta")}
        />
        <span className="oc-checkout-payment-copy">
          <span className="oc-checkout-payment-head">
            <strong>Tarjeta de crédito sin interés</strong>
            <span className="oc-checkout-payment-emoji" aria-hidden>
              💳
            </span>
            <span className="oc-checkout-payment-arrow" aria-hidden>
              ⟶
            </span>
            <span className="oc-checkout-payment-amount">
              Total a pagar: <strong>{formatArs(payTarjeta)}</strong>
            </span>
          </span>
          <small>
            Paga en hasta <strong>{maxInstallments} cuotas</strong> sin interés con
            tarjeta de crédito de <strong>todos los bancos</strong>.
          </small>
        </span>
      </label>

      {metodo === "tarjeta" && (
        <div className="oc-checkout-card-panel">
          {brickEnabled ? (
            <CardBrick
              amount={payTarjeta}
              maxInstallments={maxInstallments}
              publicKey={publicKey!}
              onPay={payWithCard}
            />
          ) : (
            <CardPlaceholder />
          )}
        </div>
      )}

      <label
        className={`oc-checkout-payment-option${metodo === "mercado_pago" ? " is-active" : ""}`}
      >
        <input
          type="radio"
          name="tipo_pago"
          value="mercado_pago"
          checked={metodo === "mercado_pago"}
          onChange={() => setMetodo("mercado_pago")}
        />
        <span className="oc-checkout-payment-copy">
          <span className="oc-checkout-payment-head">
            <strong>Mercado Pago - Paga con un 10% de descuento</strong>
            <span className="oc-checkout-payment-emoji" aria-hidden>
              🤝
            </span>
            <span className="oc-checkout-payment-arrow" aria-hidden>
              ⟶
            </span>
            <span className="oc-checkout-payment-amount">
              Total a pagar: <strong>{formatArs(payContado)}</strong>
            </span>
          </span>
          <small>
            Paga al <strong>contado</strong> con tus tarjetas o dinero en cuenta con un{" "}
            <strong>10% de descuento</strong>.
          </small>
        </span>
      </label>

      {error && <p className="oc-checkout-payment-warning">{error}</p>}

      {needsCpWarning && (
        <p className="oc-checkout-payment-warning">
          Para envío a domicilio, validá un código postal con cobertura antes de pagar.
        </p>
      )}

      {!mpConfigured && (
        <p className="oc-checkout-payment-warning">
          Mercado Pago aún no está configurado. Agregá el Access Token y la Public Key
          para habilitar pagos.
        </p>
      )}

      <p className="oc-checkout-privacy">
        Tus datos personales se utilizarán para procesar tu pedido, mejorar tu
        experiencia en esta web y otros propósitos descritos en nuestra política de
        privacidad.
      </p>

      {metodo === "mercado_pago" && (
        <button
          type="submit"
          className="oc-btn oc-btn-dark oc-checkout-submit"
          disabled={!mpConfigured || !canPayDelivery}
        >
          Pagar con Mercado Pago
        </button>
      )}
      {metodo === "tarjeta" && !brickEnabled && (
        <button type="button" className="oc-btn oc-btn-dark oc-checkout-submit" disabled>
          Pagar con tarjeta
        </button>
      )}
    </div>
  );
}

/** Card Payment Brick de Mercado Pago (tokeniza la tarjeta en el navegador). */
function CardBrick({
  amount,
  maxInstallments,
  publicKey,
  onPay,
}: {
  amount: number;
  maxInstallments: number;
  publicKey: string;
  onPay: (cardData: unknown) => Promise<void>;
}) {
  const [Brick, setBrick] = useState<React.ComponentType<{
    initialization: { amount: number };
    customization?: {
      paymentMethods?: { maxInstallments?: number; minInstallments?: number };
    };
    onSubmit: (data: unknown) => Promise<void>;
    onError?: (err: unknown) => void;
  }> | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("@mercadopago/sdk-react").then((mp) => {
      if (cancelled) return;
      mp.initMercadoPago(publicKey, { locale: "es-AR" });
      setBrick(() => mp.CardPayment as never);
    });
    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  if (!Brick) return <p className="oc-checkout-note">Cargando formulario de pago…</p>;

  return (
    <Brick
      key={`${amount}-${maxInstallments}`}
      initialization={{ amount }}
      customization={{
        paymentMethods: {
          minInstallments: 1,
          maxInstallments,
        },
      }}
      onSubmit={onPay}
      onError={(err) => console.error("MP Brick error", err)}
    />
  );
}

/** Vista previa del formulario cuando faltan las credenciales de Mercado Pago. */
function CardPlaceholder() {
  return (
    <div className="oc-checkout-card-preview" aria-disabled>
      <div className="oc-checkout-card-brands" aria-hidden>
        <span>VISA</span>
        <span>Master</span>
        <span>Amex</span>
        <span>Naranja X</span>
        <span>Maestro</span>
      </div>
      <div className="oc-checkout-field">
        <label>
          Número de tarjeta <abbr title="obligatorio">*</abbr>
        </label>
        <input placeholder="1234 1234 1234 1234" disabled />
      </div>
      <div className="oc-checkout-field">
        <label>
          Nombre del titular <abbr title="obligatorio">*</abbr>
        </label>
        <input placeholder="Ej.: María López" disabled />
        <small className="oc-checkout-note">Complétalo como aparece en la tarjeta.</small>
      </div>
      <div className="oc-checkout-grid-2">
        <div className="oc-checkout-field">
          <label>
            Vencimiento <abbr title="obligatorio">*</abbr>
          </label>
          <input placeholder="MM/AA" disabled />
        </div>
        <div className="oc-checkout-field">
          <label>
            Código de seguridad <abbr title="obligatorio">*</abbr>
          </label>
          <input placeholder="Ej.: 123" disabled />
        </div>
      </div>
      <p className="oc-checkout-payment-warning">
        El formulario de tarjeta se habilita configurando la Public Key de Mercado Pago
        (NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY).
      </p>
    </div>
  );
}
