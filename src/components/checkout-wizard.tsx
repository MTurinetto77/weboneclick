"use client";

import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

export type CheckoutStepId = "datos" | "entrega" | "regalo" | "pago";

type StepProps = {
  id: CheckoutStepId;
  title: string;
  children: ReactNode;
};

export function CheckoutStep({ children }: StepProps) {
  return <>{children}</>;
}

function isStep(child: ReactNode): child is ReactElement<StepProps> {
  if (!isValidElement(child) || child.props == null || typeof child.props !== "object") {
    return false;
  }
  const props = child.props as Partial<StepProps>;
  return typeof props.id === "string" && typeof props.title === "string";
}

function fieldValue(form: HTMLFormElement, name: string): string {
  const checked = form.querySelector<HTMLInputElement>(
    `[name="${CSS.escape(name)}"]:checked`,
  );
  if (checked) return checked.value.trim();
  const el = form.elements.namedItem(name);
  if (
    el instanceof HTMLInputElement ||
    el instanceof HTMLSelectElement ||
    el instanceof HTMLTextAreaElement
  ) {
    return el.value.trim();
  }
  return "";
}

function summarize(
  id: CheckoutStepId,
  form: HTMLFormElement,
  contadoSummaryLabel: string,
): string {
  if (id === "datos") {
    const name = [fieldValue(form, "nombre"), fieldValue(form, "apellido")]
      .filter(Boolean)
      .join(" ");
    const resp =
      fieldValue(form, "responsabilidad_impositiva") === "RI"
        ? "Responsable inscripto"
        : "Consumidor final";
    return [name, resp, fieldValue(form, "mail")].filter(Boolean).join(" · ");
  }

  if (id === "entrega") {
    const tipo = fieldValue(form, "tipo_entrega");
    if (tipo === "retiro") {
      const select = form.querySelector<HTMLSelectElement>(
        '[name="tienda_retiro"]',
      );
      const label = select?.selectedOptions[0]?.text?.split("—")[0]?.trim();
      return ["Retiro en tienda", label].filter(Boolean).join(" · ");
    }
    const loc = fieldValue(form, "localidad");
    const cp = fieldValue(form, "codigo_postal");
    return ["Envío a domicilio", loc, cp ? `CP ${cp}` : ""]
      .filter(Boolean)
      .join(" · ");
  }

  if (id === "regalo") {
    const radio = form.querySelector<HTMLInputElement>(
      '[name="id_producto_regalo"]:checked',
    );
    const title = radio
      ?.closest("label")
      ?.querySelector(".oc-checkout-gift-title")
      ?.textContent?.trim();
    return title ? `Regalo: ${title}` : "Regalo elegido";
  }

  const modo = fieldValue(form, "modo_cobro");
  const mec =
    fieldValue(form, "mecanismo_pago_ui") || fieldValue(form, "mecanismo_pago");
  return [
    modo === "cuotas" ? "Cuotas" : contadoSummaryLabel,
    mec === "tarjeta" ? "Tarjeta" : "Mercado Pago",
  ].join(" · ");
}

function validateStepPanel(panel: HTMLElement): boolean {
  const fields = panel.querySelectorAll<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >("input, select, textarea");

  for (const field of fields) {
    if (field.disabled || field.type === "hidden") continue;
    if (!field.checkValidity()) {
      field.reportValidity();
      return false;
    }
  }

  const tipo = panel.querySelector<HTMLInputElement>(
    '[name="tipo_entrega"]:checked',
  )?.value;
  if (tipo === "envio") {
    const cp = panel.querySelector<HTMLInputElement>('[name="codigo_postal"]');
    if (panel.querySelector(".oc-checkout-cp-msg.is-error")) {
      cp?.focus();
      cp?.reportValidity();
      return false;
    }
    if (!panel.querySelector(".oc-checkout-cp-check")) {
      if (cp) {
        cp.setCustomValidity(
          "Validá el código postal con cobertura antes de continuar.",
        );
        cp.reportValidity();
        cp.setCustomValidity("");
      }
      return false;
    }
  }

  return true;
}

export function CheckoutWizard({
  children,
  contadoSummaryLabel = "Contado",
}: {
  children: ReactNode;
  contadoSummaryLabel?: string;
}) {
  const steps = Children.toArray(children).filter(isStep);
  const [active, setActive] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [summaries, setSummaries] = useState<string[]>([]);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const el = document.querySelector<HTMLElement>(".oc-checkout-step.is-open");
    if (!el) return;
    const header = document.querySelector<HTMLElement>(".oc-header-float");
    const offset = (header?.getBoundingClientRect().height ?? 96) + 16;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, [active]);

  const goNext = useCallback(
    (index: number, panel: HTMLElement | null, form: HTMLFormElement | null) => {
      if (!panel || !validateStepPanel(panel)) return;
      const summary = form
        ? summarize(steps[index].props.id, form, contadoSummaryLabel)
        : "";
      setSummaries((prev) => {
        const next = [...prev];
        next[index] = summary;
        return next;
      });
      const nextIndex =
        index < maxReached
          ? maxReached
          : Math.min(index + 1, steps.length - 1);
      setActive(nextIndex);
      setMaxReached((m) => Math.max(m, nextIndex));
    },
    [contadoSummaryLabel, maxReached, steps],
  );

  return (
    <div className="oc-checkout-wizard">
      {steps.map((step, index) => {
        const isOpen = active === index;
        const done = index < maxReached && !isOpen;
        const locked = index > maxReached;
        const n = index + 1;

        return (
          <section
            key={step.props.id}
            className={`oc-checkout-step${isOpen ? " is-open" : ""}${done ? " is-done" : ""}${locked ? " is-locked" : ""}`}
            data-step={step.props.id}
          >
            <button
              type="button"
              className="oc-checkout-step-header"
              disabled={locked}
              aria-expanded={isOpen}
              onClick={(e) => {
                if (locked || isOpen) return;
                const form = e.currentTarget.closest("form");
                if (form) {
                  const summary = summarize(
                    steps[active].props.id,
                    form,
                    contadoSummaryLabel,
                  );
                  setSummaries((prev) => {
                    const next = [...prev];
                    next[active] = summary;
                    return next;
                  });
                }
                setActive(index);
              }}
            >
              <span className="oc-checkout-step-index" aria-hidden>
                {done ? "✓" : n}
              </span>
              <span className="oc-checkout-step-heading">
                <span className="oc-checkout-step-title">{step.props.title}</span>
                {!isOpen && summaries[index] ? (
                  <span className="oc-checkout-step-summary">
                    {summaries[index]}
                  </span>
                ) : null}
              </span>
              {!isOpen && !locked ? (
                <span className="oc-checkout-step-edit">Editar</span>
              ) : null}
            </button>

            <div className="oc-checkout-step-body" hidden={!isOpen}>
              {index <= maxReached ? (
                <>
                  {step.props.children}
                  {index < steps.length - 1 ? (
                    <button
                      type="button"
                      className="oc-btn oc-btn-dark oc-checkout-step-next"
                      onClick={(e) => {
                        const section = e.currentTarget.closest(
                          ".oc-checkout-step",
                        ) as HTMLElement | null;
                        const form = e.currentTarget.closest("form");
                        goNext(index, section, form);
                      }}
                    >
                      Continuar
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
