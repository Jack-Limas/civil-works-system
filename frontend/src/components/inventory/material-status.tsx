"use client";

import { useFormatter, useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import type { MaterialStatus } from "@/types/inventory";

export const STATUS_TONE: Record<MaterialStatus, { badge: string; dot: string; bar: string }> = {
  OUT: { badge: "bg-critical/15 text-critical", dot: "bg-critical", bar: "bg-critical" },
  CRITICAL: { badge: "bg-critical/10 text-critical", dot: "bg-critical", bar: "bg-critical" },
  WARNING: { badge: "bg-warning/15 text-warning", dot: "bg-warning", bar: "bg-warning" },
  OK: { badge: "bg-success/15 text-success", dot: "bg-success", bar: "bg-success" },
};

/** Status pill with a dot; the dot pulses for OUT/CRITICAL (static with reduced motion). */
export function MaterialStatusBadge({ status }: { status: MaterialStatus }) {
  const t = useTranslations("inventory.status");
  const tone = STATUS_TONE[status];
  const urgent = status === "OUT" || status === "CRITICAL";
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${tone.badge}`}>
      <span className="relative flex h-2 w-2" aria-hidden>
        {urgent && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:animate-none ${tone.dot}`} />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${tone.dot}`} />
      </span>
      {t(status)}
    </span>
  );
}

/** Horizon shown full on the coverage meter (30 days = planning horizon). */
const METER_DAYS = 30;

/**
 * Coverage in days with a bar that fills up to the 30-day horizon. Without
 * consumption it shows "—" and an explanatory title instead of infinity.
 */
export function CoverageMeter({
  days,
  status,
  compact,
}: {
  days: number | null;
  status: MaterialStatus;
  compact?: boolean;
}) {
  const t = useTranslations("inventory");
  const format = useFormatter();
  const reduceMotion = useReducedMotion();

  if (days === null) {
    return (
      <span className="text-sm text-ink-muted" title={t("noCoverageHint")}>
        {t("noCoverage")}
      </span>
    );
  }

  const pct = Math.min(100, (days / METER_DAYS) * 100);
  return (
    <div className={compact ? "w-24" : "w-full"} title={t("coverageDays", { days: format.number(days, { maximumFractionDigits: 1 }) })}>
      <span className="font-mono-data text-sm text-ink">
        {t("coverageDays", { days: format.number(days, { maximumFractionDigits: days < 10 ? 1 : 0 }) })}
      </span>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <motion.div
          className={`h-full rounded-full ${STATUS_TONE[status].bar}`}
          initial={reduceMotion ? false : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={reduceMotion ? { width: `${pct}%` } : undefined}
        />
      </div>
    </div>
  );
}
