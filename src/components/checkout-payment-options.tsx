"use client";

import { useEffect, useRef, useState } from "react";

type Metodo = "tarjeta" | "mercado_pago";

type Props = {
  /** Total pagando con tarjeta (precio de lista) */
  totalTarjeta: number;
  /** Total pagando por Mercado Pago al contado (10% off) */
  totalContado: number;
  /** Access token configurado en el server (habilita ambos flujos) */
  mpConfigured: boolean;
  /** Public key para el Card Payment Brick (formulario de tarjeta embebido) */
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

export function CheckoutPaymentOptions({
  totalTarjeta,
  totalContado,
  mpConfigured,
  publicKey,
}: Props) {
  const [metodo, setMetodo] = useState<Metodo>("tarjeta");
  const [error, setError] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const brickEnabled = mpConfigured && !!publicKey;

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

      {/* Opción 1: tarjeta de crédito sin interés (formulario embebido) */}
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
              Total a pagar: <strong>{formatArs(totalTarjeta)}</strong>
            </span>
          </span>
          <small>
            Paga en cuotas sin interés con tarjeta de crédito de{" "}
            <strong>todos los bancos</strong>.
          </small>
        </span>
      </label>

      {metodo === "tarjeta" && (
        <div className="oc-checkout-card-panel">
          {brickEnabled ? (
            <CardBrick amount={totalTarjeta} publicKey={publicKey!} onPay={payWithCard} />
          ) : (
            <CardPlaceholder />
          )}
        </div>
      )}

      {/* Opción 2: Mercado Pago contado con 10% de descuento */}
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
              Total a pagar: <strong>{formatArs(totalContado)}</strong>
            </span>
          </span>
          <small>
            Paga al <strong>contado</strong> con tus tarjetas o dinero en cuenta con un{" "}
            <strong>10% de descuento</strong>.
          </small>
        </span>
      </label>

      {error && <p className="oc-checkout-payment-warning">{error}</p>}

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
          disabled={!mpConfigured}
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
  publicKey,
  onPay,
}: {
  amount: number;
  publicKey: string;
  onPay: (cardData: unknown) => Promise<void>;
}) {
  const [Brick, setBrick] = useState<React.ComponentType<{
    initialization: { amount: number };
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
      initialization={{ amount }}
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
