"use client";

import { forwardRef, InputHTMLAttributes } from "react";
import { useLocale } from "next-intl";
import { fieldClass } from "@/components/ui/form";

const MAX_DIGITS = 12;

type MoneyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: number | undefined;
  onValueChange: (value: number | undefined) => void;
};

/**
 * COP amount input: digits only (no decimals), grouped while typing
 * ("1.250.000" in es, "1,250,000" in en) and with the numeric keypad on phones.
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { value, onValueChange, className, ...props },
  ref
) {
  const locale = useLocale();
  const display = value === undefined ? "" : new Intl.NumberFormat(locale === "en" ? "en-US" : "es-CO").format(value);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted" aria-hidden>
        $
      </span>
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, MAX_DIGITS);
          onValueChange(digits ? Number(digits) : undefined);
        }}
        className={`${className ?? fieldClass} pl-7 font-mono-data text-lg`}
        {...props}
      />
    </div>
  );
});
