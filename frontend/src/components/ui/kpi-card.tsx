import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

export type KpiTone = "accent" | "success" | "critical" | "warning" | "neutral" | "ai";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: KpiTone;
  hint?: ReactNode;
  /** Colors the hint (and value when `emphasize` is true) with the tone. */
  emphasize?: boolean;
  loading?: boolean;
  /** Optional element next to the label (e.g. an InfoTooltip). */
  labelAddon?: ReactNode;
}

const ICON_TONE: Record<KpiTone, string> = {
  accent: "bg-accent/15 text-accent",
  success: "bg-success/15 text-success",
  critical: "bg-critical/15 text-critical",
  warning: "bg-warning/15 text-warning",
  neutral: "bg-surface-2 text-ink-muted",
  ai: "bg-ai/15 text-ai",
};

const TEXT_TONE: Record<KpiTone, string> = {
  accent: "text-accent",
  success: "text-success",
  critical: "text-critical",
  warning: "text-warning",
  neutral: "text-ink",
  ai: "text-ai",
};

export function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  hint,
  emphasize,
  loading,
  labelAddon,
}: KpiCardProps) {
  return (
    <div className="h-full rounded-xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
          {label}
          {labelAddon}
        </p>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ICON_TONE[tone]}`} aria-hidden>
          <Icon size={16} />
        </div>
      </div>
      {loading ? (
        <div className="space-y-2" aria-busy="true">
          <div className="h-8 w-24 animate-pulse rounded bg-surface-2 motion-reduce:animate-none" />
          <div className="h-3 w-32 animate-pulse rounded bg-surface-2 motion-reduce:animate-none" />
        </div>
      ) : (
        <>
          <p
            className={`truncate font-mono-data text-2xl font-semibold tabular-nums sm:text-3xl ${
              emphasize ? TEXT_TONE[tone] : "text-ink"
            }`}
          >
            {value}
          </p>
          {hint && <p className={`mt-1 text-xs ${emphasize ? TEXT_TONE[tone] : "text-ink-muted"}`}>{hint}</p>}
        </>
      )}
    </div>
  );
}
