"use client";

import { useId, useState } from "react";
import { Info } from "lucide-react";

/**
 * Accessible tooltip: opens on hover, keyboard focus or tap (touch screens have
 * no hover) and is announced through aria-describedby.
 */
export function InfoTooltip({ text, label }: { text: string; label: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={id}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="rounded-full text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
      >
        <Info size={14} aria-hidden />
      </button>
      <span
        id={id}
        role="tooltip"
        className={`absolute left-0 top-full z-30 mt-2 w-64 max-w-[80vw] rounded-lg border border-line bg-surface p-3 text-xs font-normal normal-case leading-relaxed tracking-normal text-ink shadow-lg ${
          open ? "block" : "hidden"
        }`}
      >
        {text}
      </span>
    </span>
  );
}
