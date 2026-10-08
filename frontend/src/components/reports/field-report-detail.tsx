"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { CheckCircle2, Lock, Pencil, UsersRound } from "lucide-react";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/form";
import { CompiledDaySections, WEATHER_ICON, WEATHER_TONE, useLogDate } from "./compiled-day";
import { FieldReportForm } from "./field-report-form";
import { useFieldReport, useReviewFieldReport } from "@/lib/reports-service";
import { useApiErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "@/store/toast.store";
import type { FieldReportStatus } from "@/types/reports";

export function FieldReportStatusBadge({ status }: { status: FieldReportStatus }) {
  const t = useTranslations("fieldReports.status");
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        status === "REVIEWED" ? "bg-success/15 text-success" : "bg-ai/15 text-ai"
      }`}
    >
      {status === "REVIEWED" && <CheckCircle2 size={12} aria-hidden />}
      {t(status)}
    </span>
  );
}

/** Modal body for one daily log: narrative, compiled day, review (admin) or edit (author). */
export function FieldReportDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const t = useTranslations("fieldReports");
  const format = useFormatter();
  const logDate = useLogDate();
  const errorMessage = useApiErrorMessage();
  const user = useAuthStore((s) => s.user);
  const { data: report, isLoading, isError, error } = useFieldReport(id);
  const review = useReviewFieldReport();
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-2 motion-reduce:animate-none" />
        ))}
      </div>
    );
  }
  if (isError || !report) return <p className="text-sm text-critical">{errorMessage(error)}</p>;

  const isAdmin = user?.role === "ADMIN";
  const isAuthor = user?.id === report.authorId;
  const WeatherIcon = report.weather ? WEATHER_ICON[report.weather] : null;

  if (editing) {
    return <FieldReportForm mode="edit" report={report} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />;
  }

  async function handleReview() {
    try {
      await review.mutateAsync({ id, note: note.trim() || undefined });
      toast.success(t("detail.reviewed"));
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold text-ink">{report.project.name}</p>
          <p className="text-sm first-letter:uppercase text-ink-muted">{logDate(report.date)}</p>
          <p className="text-xs text-ink-muted">
            {t("fields.author")}: {report.author.name}
          </p>
        </div>
        <FieldReportStatusBadge status={report.status} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-surface-2 px-3 py-2">
          <p className="text-xs text-ink-muted">{t("fields.weather")}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-ink">
            {WeatherIcon && report.weather ? (
              <>
                <WeatherIcon size={16} className={WEATHER_TONE[report.weather]} aria-hidden /> {t(`weather.${report.weather}`)}
              </>
            ) : (
              "—"
            )}
          </p>
        </div>
        <div className="rounded-lg bg-surface-2 px-3 py-2">
          <p className="text-xs text-ink-muted">{t("fields.workers")}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-ink">
            <UsersRound size={16} className="text-accent" aria-hidden />
            {report.workersOnSite !== null ? t("workersCount", { count: report.workersOnSite }) : "—"}
          </p>
        </div>
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold text-ink">{t("fields.summary")}</h3>
        <p className="whitespace-pre-line text-sm text-ink">{report.summary}</p>
      </div>
      <div>
        <h3 className="mb-1 text-sm font-semibold text-ink">{t("fields.issues")}</h3>
        <p className={`whitespace-pre-line text-sm ${report.issues ? "text-ink" : "text-ink-muted"}`}>{report.issues ?? t("detail.noIssues")}</p>
      </div>

      <div className="border-t border-line pt-4">
        <h3 className="mb-3 text-sm font-semibold text-ink">{t("detail.compiled")}</h3>
        <CompiledDaySections compiled={report.compiled} emptyText={t("detail.nothingCompiled")} />
      </div>

      {report.status === "REVIEWED" && report.reviewedBy && report.reviewedAt && (
        <div className="rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm">
          <p className="font-medium text-success">
            {t("detail.reviewedBy", { name: report.reviewedBy.name, date: format.dateTime(new Date(report.reviewedAt), { dateStyle: "medium", timeStyle: "short" }) })}
          </p>
          {report.reviewNote && <p className="mt-1 whitespace-pre-line text-ink">{report.reviewNote}</p>}
        </div>
      )}

      {isAdmin && report.status === "SUBMITTED" && (
        <div className="space-y-2 border-t border-line pt-4">
          <label htmlFor="review-note" className="text-sm font-medium text-ink">
            {t("detail.reviewNote")}
          </label>
          <textarea
            id="review-note"
            rows={2}
            maxLength={1000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("detail.reviewNotePlaceholder")}
            className={fieldClass}
          />
          <div className="flex justify-end">
            <button type="button" onClick={handleReview} disabled={review.isPending} className={primaryButtonClass}>
              <CheckCircle2 size={16} aria-hidden /> {t("detail.review")}
            </button>
          </div>
        </div>
      )}

      {isAuthor && !isAdmin && (
        <div className="flex justify-end border-t border-line pt-4">
          {report.status === "SUBMITTED" ? (
            <button type="button" onClick={() => setEditing(true)} className={secondaryButtonClass}>
              <Pencil size={15} aria-hidden /> {t("todayEdit")}
            </button>
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-ink-muted">
              <Lock size={13} aria-hidden /> {t("form.readOnly")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
