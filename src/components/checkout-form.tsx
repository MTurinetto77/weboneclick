"use client";

import type { FormEvent, ReactNode } from "react";

/** Formulario de checkout: los pagos van por API, no por server action. */
export function CheckoutForm({ children }: { children: ReactNode }) {
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
  }

  return (
    <form className="oc-checkout-layout" onSubmit={onSubmit} noValidate={false}>
      {children}
    </form>
  );
}
