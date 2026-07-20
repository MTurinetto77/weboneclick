"use client";

import { useState } from "react";
import Link from "next/link";

type Props = {
  productTitle: string;
  productSku?: string | null;
};

export function ProductReserveForm({ productTitle, productSku }: Props) {
  const [status, setStatus] = useState<"idle" | "sent">("idle");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    if (!email) return;

    const subject = `Aviso de stock: ${productTitle}`;
    const body = [
      "Quiero que me avisen cuando este producto vuelva a estar disponible.",
      "",
      `Producto: ${productTitle}`,
      productSku ? `SKU: ${productSku}` : null,
      `Email: ${email}`,
    ]
      .filter(Boolean)
      .join("\n");

    window.location.href = `mailto:info@oneclickstore.com?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
    setStatus("sent");
  }

  return (
    <div className="oc-pdp-reserve">
      <h3>Reservá este producto antes que llegue!</h3>
      <p>¡No te preocupes! Dejá tu correo electrónico y te avisaremos en cuanto vuelva a estar disponible.</p>
      <form className="oc-pdp-reserve-form" onSubmit={onSubmit}>
        <input
          type="email"
          name="email"
          placeholder="Tu correo electrónico"
          required
          autoComplete="email"
        />
        <button type="submit" className="oc-btn oc-btn-dark">
          Reservar!
        </button>
        <label className="oc-pdp-reserve-privacy">
          <input type="checkbox" name="privacy" required />
          <span>
            He leído y acepto la{" "}
            <Link href="/politica-privacidad" target="_blank">
              política de privacidad
            </Link>
          </span>
        </label>
      </form>
      {status === "sent" ? (
        <p className="muted oc-pdp-reserve-ok">Se abrió tu cliente de correo para enviar la reserva.</p>
      ) : null}
    </div>
  );
}
