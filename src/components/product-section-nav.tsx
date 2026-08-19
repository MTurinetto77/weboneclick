"use client";

import { useState } from "react";

type Section = { id: string; label: string };

export function ProductSectionNav({ sections }: { sections: Section[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");

  function handleClick(id: string) {
    if (id === active) return;
    setActive(id);
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) el.style.display = s.id === id ? "" : "none";
    });
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  if (sections.length === 0) return null;

  return (
    <nav className="oc-pdp-section-nav" aria-label="Secciones del producto">
      <div className="oc-pdp-section-nav-inner">
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`oc-pdp-section-nav-item${active === s.id ? " is-active" : ""}`}
            onClick={() => handleClick(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
