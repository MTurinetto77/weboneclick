"use client";

import { useState } from "react";
import { submitContactForm, type ContactSubmitStatus } from "@/lib/submit-contact-form";

export function NewsletterForm() {
  const [status, setStatus] = useState<ContactSubmitStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    const fd = new FormData(e.currentTarget);
    const result = await submitContactForm("newsletter", fd);
    if (!result.ok) {
      setError(result.error);
      setStatus("error");
      return;
    }
    setStatus("sent");
    e.currentTarget.reset();
  }

  return (
    <form className="oc-newsletter" onSubmit={onSubmit}>
      <input type="email" name="email" placeholder="Email" required />
      <button type="submit" disabled={status === "loading"}>
        {status === "loading" ? "…" : "Enviar"}
      </button>
      {status === "sent" ? (
        <p className="muted" style={{ margin: "0.5rem 0 0", width: "100%" }}>
          ¡Gracias por suscribirte!
        </p>
      ) : null}
      {error ? (
        <p className="muted" style={{ margin: "0.5rem 0 0", width: "100%", color: "#c00" }}>
          {error}
        </p>
      ) : null}
    </form>
  );
}
