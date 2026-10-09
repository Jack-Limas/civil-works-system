"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { RefreshCw, Sparkles } from "lucide-react";
import { secondaryButtonClass } from "@/components/ui/form";
import { useReportSummary } from "@/lib/reports-service";
import { getHttpStatus } from "@/lib/api-error";
import { apiErrorCode, quotaHours } from "@/lib/api-client";
import type { ReportParams, ReportType } from "@/types/reports";

/** Inline **bold** only; everything else is plain text (no HTML is ever injected). */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-ink">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    )
  );
}

/** Minimal renderer for the model's text: paragraphs, "-"/"*" bullets and headings as bold lines. */
function SummaryText({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="space-y-3 text-sm leading-relaxed text-ink">
      {blocks.map((block, i) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.every((l) => /^[-*•]\s+/.test(l))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5 marker:text-ai">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^[-*•]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {/^#{1,4}\s+/.test(l) ? <strong className="font-semibold">{l.replace(/^#{1,4}\s+/, "")}</strong> : inline(l.replace(/^[-*•]\s+/, "• "))}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Optional Gemini summary. The server builds the prompt from the same report
 * data; if the AI fails the report is still fully usable.
 */
export function AiSummaryPanel({ type, params }: { type: ReportType; params: ReportParams }) {
  const t = useTranslations("reports.ai");
  const locale = useLocale();
  const reduceMotion = useReducedMotion();
  const summary = useReportSummary();
  const generate = () => summary.mutate({ type, locale, ...params });
  const status = getHttpStatus(summary.error);
  const quota = apiErrorCode(summary.error) === "AI_QUOTA_EXCEEDED";

  return (
    <section className="print-avoid-break relative overflow-hidden rounded-xl border border-ai/30 bg-surface p-5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-ai via-accent to-ai opacity-70" aria-hidden />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ai/15 text-ai" aria-hidden>
            <Sparkles size={20} />
          </span>
          <div>
            <h2 className="text-base font-semibold text-ink">{t("title")}</h2>
            {!summary.data && !summary.isPending && <p className="text-sm text-ink-muted">{t("hint")}</p>}
          </div>
        </div>
        {!summary.isPending && (
          <button
            type="button"
            onClick={generate}
            className={
              summary.data
                ? `${secondaryButtonClass} print:hidden`
                : "inline-flex min-h-10 items-center gap-2 rounded-lg bg-ai px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai print:hidden"
            }
          >
            {summary.data ? <RefreshCw size={15} aria-hidden /> : <Sparkles size={15} aria-hidden />}
            {summary.data ? t("regenerate") : summary.isError ? t("retry") : t("button")}
          </button>
        )}
      </div>

      <div aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          {summary.isPending && (
            <motion.div
              key="loading"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-4 space-y-2"
              aria-busy="true"
            >
              <p className="flex items-center gap-2 text-sm text-ai">
                <Sparkles size={14} className="animate-pulse motion-reduce:animate-none" aria-hidden /> {t("loading")}
              </p>
              {["w-full", "w-11/12", "w-4/5", "w-2/3"].map((w) => (
                <div key={w} className={`h-3 ${w} animate-pulse rounded bg-ai/10 motion-reduce:animate-none`} />
              ))}
            </motion.div>
          )}
          {summary.isError && (
            <motion.p
              key="error"
              initial={reduceMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              role="alert"
              className={`mt-4 rounded-lg px-3 py-2 text-sm ${status === 429 || quota ? "bg-warning/10 text-warning" : "bg-critical/10 text-critical"}`}
            >
              {quota ? t("quotaExceeded", { hours: quotaHours(summary.error) }) : status === 429 ? t("rateLimited") : t("error")}
            </motion.p>
          )}
          {summary.data && !summary.isPending && (
            <motion.div
              key="result"
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-4"
            >
              <SummaryText text={summary.data.summary} />
              <p className="mt-4 border-t border-line pt-3 text-xs text-ink-muted">
                {t("disclaimer")} <span className="font-mono-data">· {summary.data.model}</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
