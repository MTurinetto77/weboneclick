"use client";

import { useState, type ReactNode } from "react";

type AccordionItem = { id: string; title: string; content: ReactNode };

export function ProductNeoAccordion({ items }: { items: AccordionItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (items.length === 0) return null;

  return (
    <div className="oc-neo-accordion">
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div className="oc-neo-accordion-item" key={item.id}>
            <button
              type="button"
              className="oc-neo-accordion-trigger"
              aria-expanded={isOpen}
              onClick={() => setOpenId(isOpen ? null : item.id)}
            >
              <span>{item.title}</span>
              <span
                className={`oc-neo-accordion-icon${isOpen ? " is-open" : ""}`}
                aria-hidden="true"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>
            {isOpen && <div className="oc-neo-accordion-panel">{item.content}</div>}
          </div>
        );
      })}
    </div>
  );
}
