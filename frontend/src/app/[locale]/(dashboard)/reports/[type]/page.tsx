"use client";

import { useState } from "react";
import { notFound, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Printer, RefreshCw } from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { AdminOnly } from "@/components/auth/admin-only";
import { Reveal, RevealItem } from "@/components/ui/reveal";
import { secondaryButtonClass } from "@/components/ui/form";
import { ReportPrintHeader } from "@/components/reports/report-print-header";
import { ReportFilters, ReportMetaLine, type Preset } from "@/components/reports/report-ui";
import { AiSummaryPanel } from "@/components/reports/ai-summary-panel";
import { ProgressReportView } from "@/components/reports/progress-report-view";
import { FinancialReportView } from "@/components/reports/financial-report-view";
import { MaterialsReportView } from "@/components/reports/materials-report-view";
import { IncidentsReportView } from "@/components/reports/incidents-report-view";
import { Link } from "@/i18n/navigation";
import { useReport } from "@/lib/reports-service";
import { useProjects } from "@/lib/projects-service";
import { useApiErrorMessage } from "@/lib/api-error";
import { REPORT_TYPES, type AnyReport, type ReportParams, type ReportType } from "@/types/reports";

function isReportType(value: string): value is ReportType {
  return (REPORT_TYPES as readonly string[]).includes(value);
}

function ReportBody({ report }: { report: AnyReport }) {
  switch (report.type) {
    case "progress":
      return <ProgressReportView report={report} />;
    case "financial":
      return <FinancialReportView report={report} />;
    case "materials":
      return <MaterialsReportView report={report} />;
    case "incidents":
      return <IncidentsReportView report={report} />;
  }
}

function ReportScreen({ type }: { type: ReportType }) {
  const t = useTranslations("reports");
  const errorMessage = useApiErrorMessage();
  // No dates = the server's default window (last 30 days), shown as the 30-day preset
  const [params, setParams] = useState<ReportParams>({});
  const [preset, setPreset] = useState<Preset | null>(30);
  const { data, isLoading, isError, error, isFetching, refetch } = useReport(type, params);
  const { data: projects } = useProjects({ limit: 100 });
  const projectName = params.projectId ? projects?.data.find((p) => p.id === params.projectId)?.name : undefined;
  const title = t(`types.${type}.title`);

  return (
    <>
      <DashboardHeader title={title} subtitle={t(`types.${type}.description`)} />
      <main className="space-y-5 p-4 sm:p-6 print:p-0">
        <ReportPrintHeader
          title={title}
          projectName={projectName}
          period={data?.period}
          generatedBy={data?.meta.generatedBy.name}
          generatedAt={data?.meta.generatedAt}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href="/reports" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-accent">
            <ArrowLeft size={15} aria-hidden /> {t("back")}
          </Link>
          <button type="button" onClick={() => window.print()} disabled={!data} className={secondaryButtonClass}>
            <Printer size={15} aria-hidden /> {t("print")}
          </button>
        </div>

        <ReportFilters
          params={params}
          preset={preset}
          onChange={(next, nextPreset) => {
            setParams(next);
            setPreset(nextPreset);
          }}
        />

        {isLoading && (
          <div className="space-y-4" aria-busy="true">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-surface motion-reduce:animate-none" />
              ))}
            </div>
            <div className="h-72 animate-pulse rounded-xl bg-surface motion-reduce:animate-none" />
          </div>
        )}

        {isError && !data && (
          <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-critical/30 bg-critical/5 p-8 text-center">
            <p className="text-sm text-critical">{errorMessage(error)}</p>
            <button type="button" onClick={() => refetch()} className={secondaryButtonClass}>
              <RefreshCw size={15} aria-hidden /> {t("ai.retry")}
            </button>
          </div>
        )}

        {data && (
          <Reveal className={`space-y-5 transition-opacity ${isFetching ? "opacity-70" : ""}`}>
            <RevealItem>
              <ReportMetaLine meta={data.meta} period={data.period} />
            </RevealItem>
            {data.meta.recordCount === 0 && (
              <RevealItem>
                <p className="rounded-xl border border-dashed border-line bg-surface p-4 text-center text-sm text-ink-muted">{t("empty")}</p>
              </RevealItem>
            )}
            <RevealItem>
              {/* Keyed by the query so a new period never shows a summary of the old one */}
              <AiSummaryPanel key={JSON.stringify(params)} type={type} params={params} />
            </RevealItem>
            <RevealItem>
              <ReportBody report={data} />
            </RevealItem>
          </Reveal>
        )}
      </main>
    </>
  );
}

/** Report view (CSR): server-computed data, charts, CSV, print/PDF and an optional AI summary. */
export default function ReportTypePage() {
  const { type } = useParams<{ type: string }>();
  if (!isReportType(type)) notFound();

  return type === "financial" ? (
    <AdminOnly>
      <ReportScreen type={type} />
    </AdminOnly>
  ) : (
    <ReportScreen type={type} />
  );
}
