import { useCallback } from "react";
import { useLocale } from "next-intl";

/** UI locale -> number formatting locale. Currency is ALWAYS COP regardless of language. */
const NUMBER_LOCALE: Record<string, string> = { es: "es-CO", en: "en-US" };

const formatters = new Map<string, Intl.NumberFormat>();

/** Intl.NumberFormat is expensive to build, so instances are cached per locale/variant. */
function getFormatter(locale: string, fractionDigits: number) {
  const key = `${locale}:${fractionDigits}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(NUMBER_LOCALE[locale] ?? "es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: fractionDigits,
    });
    formatters.set(key, formatter);
  }
  return formatter;
}

const MILLION = 1_000_000;

/**
 * Formats an amount in Colombian pesos without decimals.
 * Accepts Prisma Decimal values serialized as strings.
 * `compact` expresses amounts of a million or more in millions, the way
 * budgets are read in Colombia: "$ 8.610 M" (es) / "COP 8,610M" (en).
 * Intl's own compact notation drops thousand separators in Spanish ("8610 M").
 */
export function formatCOP(
  value: number | string | null | undefined,
  locale = "es",
  options: { compact?: boolean } = {}
): string {
  const raw = Number(value ?? 0);
  const amount = Number.isFinite(raw) ? raw : 0;
  if (!options.compact || Math.abs(amount) < MILLION) return getFormatter(locale, 0).format(amount);

  const millions = amount / MILLION;
  const digits = Math.abs(millions) < 100 ? 1 : 0;
  return `${getFormatter(locale, digits).format(millions)}${locale === "en" ? "M" : " M"}`;
}

/** Hook version bound to the active UI locale. */
export function useFormatCOP() {
  const locale = useLocale();
  return useCallback(
    (value: number | string | null | undefined, options?: { compact?: boolean }) =>
      formatCOP(value, locale, options),
    [locale]
  );
}
