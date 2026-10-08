"use client";

import type { ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Download, Timer } from "lucide-react";
import { fieldClass, secondaryButtonClass } from "@/components/ui/form";
import { ProjectSelect } from "@/components/projects/project-select";
import type { ReportMeta, ReportParams } from "@/types/reports";

export const PRESETS = [7, 30, 90] as const;
export type Preset = (typeof PRESETS)[number];

/** yyyy-mm-dd of a local date (toISOString would shift it to UTC). */
export function dateKey(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Range for a preset, ending today. Only called from event handlers. */
export function presetRange(days: Preset): Pick<ReportParams, "from" | "to"> {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - (days - 1));
  return { from: dateKey(from), to: dateKey(to) };
}

export function useDayLabel() {
  const format = useFormatter();
  return (key: string, withYear = false) =>
    format.dateTime(new Date(`${key.slice(0, 10)}T12:00:00Z`), {
      day: "numeric",
      month: "short",
      ...(withYear ? { year: "numeric" } : {}),
      timeZone: "UTC",
    });
}

export function ReportFilters({
  params,
  preset,
  onChange,
}: {
  params: ReportParams;
  preset: Preset | null;
  onChange: (params: ReportParams, preset: Preset | null) => void;
}) {
  const t = useTranslations("reports.filters");
  const tReports = useTranslations("reports");

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3 print:hidden lg:flex-row lg:items-end">
      <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-ink-muted">
        {t("project")}
        <ProjectSelect
          allowNone
          noneLabel={t("allProjects")}
          value={params.projectId ?? ""}
          onChange={(e) => onChange({ ...params, projectId: e.target.value || undefined }, preset)}
          className={fieldClass}
        />
      </label>
      <div role="radiogroup" aria-label={tReports("printHeader.period")} className="inline-flex self-start rounded-lg border border-line bg-surface-2 p-0.5 lg:self-auto">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={preset === p}
            onClick={() => onChange({ ...params, ...presetRange(p) }, p)}
            className={`min-h-10 rounded-md px-3 text-sm font-medium transition-colors ${
              preset === p ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink"
            }`}
          >
            {t(`presets.${p}`)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 lg:w-80">
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-muted">
          {t("from")}
          <input
            type="date"
            value={params.from ?? ""}
            max={params.to}
            onChange={(e) => e.target.value && onChange({ ...params, from: e.target.value }, null)}
            className={fieldClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-muted">
          {t("to")}
          <input
            type="date"
            value={params.to ?? ""}
            min={params.from}
            onChange={(e) => e.target.value && onChange({ ...params, to: e.target.value }, null)}
            className={fieldClass}
          />
        </label>
      </div>
    </div>
  );
}

export function ReportKpi({ label, children, tone, hint }: { label: string; children: ReactNode; tone?: string; hint?: ReactNode }) {
  return (
    <div className="print-avoid-break rounded-xl border border-line bg-surface p-4">
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <div className={`mt-1 font-mono-data text-xl font-semibold sm:text-2xl ${tone ?? "text-ink"}`}>{children}</div>
      {hint && <div className="mt-0.5 text-xs text-ink-muted">{hint}</div>}
    </div>
  );
}

export function ChartCard({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`print-avoid-break rounded-xl border border-line bg-surface p-5 ${className ?? ""}`}>
      <h2 className="mb-3 text-base font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

export function TableCard({ title, onExport, children }: { title: string; onExport?: () => void; children: ReactNode }) {
  const t = useTranslations("reports");
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {onExport && (
          <button type="button" onClick={onExport} className={`${secondaryButtonClass} print:hidden`}>
            <Download size={15} aria-hidden /> {t("export")}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

/** "Generated in N ms · M records": the server measures it and also sends Server-Timing. */
export function ReportMetaLine({ meta, period }: { meta: ReportMeta; period: { from: string; to: string } }) {
  const t = useTranslations("reports");
  const format = useFormatter();
  const day = useDayLabel();

  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
      <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 font-mono-data">
        <Timer size={12} aria-hidden /> {t("meta", { ms: format.number(meta.durationMs), count: meta.recordCount })}
      </span>
      <span>{t("period", { from: day(period.from, true), to: day(period.to, true) })}</span>
      <span>
        {t("metaBy", {
          name: meta.generatedBy.name,
          date: format.dateTime(new Date(meta.generatedAt), { dateStyle: "medium", timeStyle: "short" }),
        })}
      </span>
    </p>
  );
}

export const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 8,
  color: "var(--ink)",
  fontSize: 12,
};
export const axisTick = { fill: "var(--ink-muted)", fontSize: 11 };
