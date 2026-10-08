"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Eye, UsersRound } from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DataTable } from "@/components/ui/data-table";
import { Reveal, RevealItem } from "@/components/ui/reveal";
import { fieldClass, secondaryButtonClass } from "@/components/ui/form";
import { ProjectSelect } from "@/components/projects/project-select";
import { Link } from "@/i18n/navigation";
import { useFieldReports } from "@/lib/reports-service";
import { WEATHER_ICON, WEATHER_TONE, useLogDate } from "./compiled-day";
import { FieldReportStatusBadge } from "./field-report-detail";
import type { FieldReport, FieldReportFilters, FieldReportStatus } from "@/types/reports";

const PAGE_SIZE = 15;

/** Admin review queue: every resident's daily logs, pending ones first by default. */
export function AdminDailyLog({ onOpen }: { onOpen: (id: string) => void }) {
  const t = useTranslations("fieldReports");
  const tReports = useTranslations("reports");
  const tList = useTranslations("expense.list");
  const logDate = useLogDate();
  const [filters, setFilters] = useState<FieldReportFilters>({ status: "SUBMITTED", page: 1, limit: PAGE_SIZE });
  const { data, isLoading, isFetching } = useFieldReports(filters);
  const update = (patch: Partial<FieldReportFilters>) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));
  const pagination = data?.pagination;

  return (
    <>
      <DashboardHeader title={t("title")} subtitle={t("subtitle")} />
      <main className="space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/reports" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-accent">
            <ArrowLeft size={15} aria-hidden /> {tReports("back")}
          </Link>
          <span className="rounded-full bg-ai/15 px-3 py-1 text-sm font-medium text-ai">{t("pendingCount", { count: data?.pendingReview ?? 0 })}</span>
        </div>

        <Reveal className="space-y-4">
          <RevealItem>
            <div className="grid grid-cols-1 gap-2 rounded-xl border border-line bg-surface p-3 sm:grid-cols-2 xl:grid-cols-4">
              <ProjectSelect
                allowNone
                noneLabel={tReports("filters.allProjects")}
                aria-label={t("fields.project")}
                value={filters.projectId ?? ""}
                onChange={(e) => update({ projectId: e.target.value || undefined })}
                className={fieldClass}
              />
              <select
                aria-label={t("fields.status")}
                value={filters.status ?? ""}
                onChange={(e) => update({ status: (e.target.value || undefined) as FieldReportStatus | undefined })}
                className={fieldClass}
              >
                <option value="">{t("allStatuses")}</option>
                <option value="SUBMITTED">{t("status.SUBMITTED")}</option>
                <option value="REVIEWED">{t("status.REVIEWED")}</option>
              </select>
              <input
                type="date"
                aria-label={tReports("filters.from")}
                value={filters.from ?? ""}
                max={filters.to}
                onChange={(e) => update({ from: e.target.value || undefined })}
                className={fieldClass}
              />
              <input
                type="date"
                aria-label={tReports("filters.to")}
                value={filters.to ?? ""}
                min={filters.from}
                onChange={(e) => update({ to: e.target.value || undefined })}
                className={fieldClass}
              />
            </div>
          </RevealItem>

          <RevealItem className={isFetching && !isLoading ? "opacity-70 transition-opacity" : ""}>
            <DataTable<FieldReport>
              rows={data?.data ?? []}
              isLoading={isLoading}
              rowKey={(r) => r.id}
              emptyMessage={t("empty")}
              actionsHeader={t("detail.open")}
              rowActions={(r) => (
                <button type="button" onClick={() => onOpen(r.id)} className={secondaryButtonClass}>
                  <Eye size={15} aria-hidden /> {t("detail.open")}
                </button>
              )}
              columns={[
                {
                  id: "project",
                  header: t("fields.project"),
                  primary: true,
                  accessor: (r) => (
                    <button type="button" onClick={() => onOpen(r.id)} className="min-w-0 text-left">
                      <span className="block truncate font-medium text-ink hover:text-accent">{r.project.name}</span>
                      <span className="block truncate text-xs text-ink-muted">{r.summary}</span>
                    </button>
                  ),
                },
                { id: "date", header: t("fields.date"), accessor: (r) => <span className="whitespace-nowrap">{logDate(r.date, "short")}</span> },
                { id: "author", header: t("fields.author"), accessor: (r) => r.author.name },
                {
                  id: "weather",
                  header: t("fields.weather"),
                  accessor: (r) => {
                    if (!r.weather) return <span className="text-ink-muted">—</span>;
                    const Icon = WEATHER_ICON[r.weather];
                    return (
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                        <Icon size={15} className={WEATHER_TONE[r.weather]} aria-hidden /> {t(`weather.${r.weather}`)}
                      </span>
                    );
                  },
                },
                {
                  id: "workers",
                  header: t("fields.workers"),
                  align: "right",
                  accessor: (r) =>
                    r.workersOnSite !== null ? (
                      <span className="inline-flex items-center gap-1 font-mono-data">
                        <UsersRound size={13} className="text-ink-muted" aria-hidden /> {r.workersOnSite}
                      </span>
                    ) : (
                      <span className="text-ink-muted">—</span>
                    ),
                },
                { id: "status", header: t("fields.status"), accessor: (r) => <FieldReportStatusBadge status={r.status} /> },
              ]}
            />
          </RevealItem>
        </Reveal>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 text-sm text-ink-muted">
            <button type="button" className={secondaryButtonClass} disabled={pagination.page <= 1} onClick={() => update({ page: pagination.page - 1 })}>
              {tList("prev")}
            </button>
            <span>{tList("page", { page: pagination.page, total: pagination.totalPages })}</span>
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => update({ page: pagination.page + 1 })}
            >
              {tList("next")}
            </button>
          </div>
        )}
      </main>
    </>
  );
}
