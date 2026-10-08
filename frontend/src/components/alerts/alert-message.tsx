"use client";

import { useLocale, useTranslations } from "next-intl";

type AlertLike = {
  type: "SCHEDULE" | "FINANCIAL" | "ACTIVITY" | "INVENTORY";
  message: string;
  params?: Record<string, number> | null;
};

/**
 * Alerts store the numbers behind the rule (params), so the text is rendered
 * in the active language. Older alerts without params fall back to the stored
 * Spanish message (es) or to the translated description of the type.
 */
export function AlertMessage({ alert }: { alert: AlertLike }) {
  const t = useTranslations("alerts");
  const locale = useLocale();

  if (alert.params && alert.type !== "INVENTORY") return <>{t(`templates.${alert.type}`, alert.params)}</>;
  return <>{locale === "es" ? alert.message : t(`generic.${alert.type}`)}</>;
}
