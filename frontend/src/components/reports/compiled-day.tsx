"use client";

import type { ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Camera, Cloud, CloudLightning, CloudRain, ListChecks, Package, Receipt, Sun, TriangleAlert, type LucideIcon } from "lucide-react";
import { ExpenseStatusBadge } from "@/components/finance/expense-status-badge";
import { useFormatCOP } from "@/lib/format";
import type { CompiledDay, Weather } from "@/types/reports";

export const WEATHER_ICON: Record<Weather, LucideIcon> = {
  SUNNY: Sun,
  CLOUDY: Cloud,
  RAINY: CloudRain,
  STORMY: CloudLightning,
};

export const WEATHER_TONE: Record<Weather, string> = {
  SUNNY: "text-warning",
  CLOUDY: "text-ink-muted",
  RAINY: "text-ai",
  STORMY: "text-critical",
};

/** Business date "YYYY-MM-DD" as a readable label (noon UTC avoids timezone day shifts). */
export function useLogDate() {
  const format = useFormatter();
  return (key: string, style: "long" | "short" = "long") =>
    format.dateTime(
      new Date(`${key.slice(0, 10)}T12:00:00Z`),
      style === "long" ? { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" } : { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }
    );
}

function Section({ icon: Icon, title, count, children }: { icon: LucideIcon; title: string; count: number; children: ReactNode }) {
  if (count === 0) return null;
  return (
    <div className="print-avoid-break">
      <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        <Icon size={13} aria-hidden /> {title}
        <span className="rounded-full bg-surface-2 px-1.5 font-mono-data text-[11px]">{count}</span>
      </h4>
      <ul className="space-y-1.5">{children}</ul>
    </div>
  );
}

/** What the system already knows about the day: activities, incidents, photos, materials and expenses. */
export function CompiledDaySections({ compiled }: { compiled: CompiledDay }) {
  const t = useTranslations("fieldReports");
  const tIncidents = useTranslations("incidents");
  const tCategory = useTranslations("expenses.categories");
  const format = useFormatter();
  const formatCOP = useFormatCOP();
  const qty = (v: number) => format.number(v, { maximumFractionDigits: 2 });
  const total = Object.values(compiled.counts).reduce((a, b) => a + b, 0);

  if (total === 0) {
    return <p className="rounded-lg border border-dashed border-line p-4 text-center text-sm text-ink-muted">{t("form.nothingCompiled")}</p>;
  }

  return (
    <div className="space-y-4">
      <Section icon={ListChecks} title={t("sections.activities")} count={compiled.counts.activities}>
        {compiled.activities.map((a) => (
          <li key={a.id} className="flex items-start justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2 text-sm">
            <span className="min-w-0">
              <span className="block text-ink">{a.name}</span>
              {a.observations && <span className="block text-xs text-ink-muted">{a.observations}</span>}
            </span>
            <span className="shrink-0 font-mono-data text-xs text-accent">{qty(a.progressPercentage)} %</span>
          </li>
        ))}
      </Section>

      <Section icon={TriangleAlert} title={t("sections.incidents")} count={compiled.counts.incidents}>
        {compiled.incidents.map((i) => (
          <li key={i.id} className="rounded-lg bg-surface-2 px-3 py-2 text-sm">
            <span className="mr-2 text-xs font-medium text-critical">
              {tIncidents(`types.${i.type}`)} · {tIncidents(`priorities.${i.priority}`)}
            </span>
            <span className="text-ink">{i.description}</span>
          </li>
        ))}
      </Section>

      <Section icon={Camera} title={t("sections.evidence")} count={compiled.counts.evidence}>
        <li className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {compiled.evidence.map((e) => (
            // eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL; crossOrigin is required by COEP
            <img
              key={e.id}
              src={e.imageUrl}
              alt={e.description ?? t("sections.evidence")}
              crossOrigin="anonymous"
              loading="lazy"
              className="aspect-square w-full rounded-lg border border-line object-cover"
            />
          ))}
        </li>
      </Section>

      <Section icon={Package} title={t("sections.materials")} count={compiled.counts.materialMovements}>
        {compiled.materialMovements.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2 text-sm">
            <span className="min-w-0 truncate text-ink">{m.material.name}</span>
            <span className={`shrink-0 font-mono-data text-xs font-semibold ${m.type === "IN" ? "text-success" : "text-accent"}`}>
              {m.type === "IN" ? "+" : "−"}
              {qty(m.quantity)} {m.material.unit}
            </span>
          </li>
        ))}
      </Section>

      <Section icon={Receipt} title={t("sections.expenses")} count={compiled.counts.expenses}>
        {compiled.expenses.map((x) => (
          <li key={x.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2 text-sm">
            <span className="min-w-0">
              <span className="block truncate text-ink">{x.description ?? tCategory(x.category)}</span>
              <span className="text-xs text-ink-muted">{tCategory(x.category)}</span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-0.5">
              <span className="font-mono-data text-xs text-ink">{formatCOP(x.amount)}</span>
              <ExpenseStatusBadge status={x.status} />
            </span>
          </li>
        ))}
      </Section>
    </div>
  );
}
