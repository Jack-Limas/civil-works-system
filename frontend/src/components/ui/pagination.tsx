"use client";

import { useTranslations } from "next-intl";
import { secondaryButtonClass } from "./form";

/** Previous / next with "Page X of Y". Renders nothing for a single page. */
export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  const t = useTranslations("expense.list");
  if (totalPages <= 1) return null;
  return (
    <nav className="flex items-center justify-between gap-3 text-sm text-ink-muted" aria-label={t("page", { page, total: totalPages })}>
      <button type="button" className={secondaryButtonClass} disabled={page <= 1} onClick={() => onChange(page - 1)}>
        {t("prev")}
      </button>
      <span aria-live="polite">{t("page", { page, total: totalPages })}</span>
      <button type="button" className={secondaryButtonClass} disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        {t("next")}
      </button>
    </nav>
  );
}
