"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, Building2, Gauge, Package } from "lucide-react";
import { useDashboardSummary } from "@/lib/dashboard-service";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { Reveal, RevealItem } from "@/components/ui/reveal";
import { ProjectsTimeline } from "@/components/dashboard/projects-timeline";
import { CriticalAlertsWidget } from "@/components/dashboard/critical-alerts-widget";
import { UpcomingMilestonesWidget } from "@/components/dashboard/upcoming-milestones-widget";
import { FieldActivityFeed } from "@/components/dashboard/field-activity-feed";
import { FloatingAIWidget } from "@/components/dashboard/floating-ai-widget";
import { useSharedAnalysisStatus } from "@/hooks/use-shared-analysis-status";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const tAnalysis = useTranslations("analysis");
  const { data: summary, isLoading, isError, refetch } = useDashboardSummary();
  const tErrors = useTranslations("errors");

  // Status shared across tabs through the SharedWorker
  const { status: sharedStatus } = useSharedAnalysisStatus();

  return (
    <>
      <DashboardHeader title={t("title")} subtitle={t("subtitle")} />

      <main className="flex-1 p-4 sm:p-6">
        <Reveal className="space-y-5">
          {sharedStatus.status === "running" && sharedStatus.stage && (
            <div
              role="status"
              className="flex items-center gap-2 rounded-lg border border-ai/30 bg-ai/10 p-3 text-xs font-medium text-ai"
            >
              <span className="relative flex h-2.5 w-2.5" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ai opacity-75 motion-reduce:animate-none" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-ai" />
              </span>
              {tAnalysis("syncBanner", { stage: tAnalysis(`stages.${sharedStatus.stage}`) })}
            </div>
          )}

          {isError && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-critical/30 bg-critical/10 p-3 text-sm text-ink">
              {tErrors("loadFailed")}
              <button type="button" onClick={() => refetch()} className="font-medium text-accent hover:underline">
                {tErrors("retry")}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
            <RevealItem>
              <KpiCard
                label={t("kpis.activeProjects")}
                value={summary?.projects.inProgress ?? 0}
                icon={Building2}
                tone="accent"
                hint={t("kpis.activeProjectsTrend", { total: summary?.projects.total ?? 0 })}
                loading={isLoading}
              />
            </RevealItem>
            <RevealItem>
              <KpiCard
                label={t("kpis.avgProgress")}
                value={`${summary?.averageProgress ?? 0}%`}
                icon={Gauge}
                tone="success"
                hint={t("kpis.avgProgressTrend")}
                loading={isLoading}
              />
            </RevealItem>
            <RevealItem>
              <KpiCard
                label={t("kpis.activeAlerts")}
                value={summary?.activeAlertsCount ?? 0}
                icon={AlertTriangle}
                tone="critical"
                emphasize={(summary?.activeAlertsCount ?? 0) > 0}
                hint={t("kpis.activeAlertsTrend", { count: summary?.projects.withActiveAlerts ?? 0 })}
                loading={isLoading}
              />
            </RevealItem>
            <RevealItem>
              <KpiCard
                label={t("kpis.lowStock")}
                value={summary?.lowStockMaterialsCount ?? 0}
                icon={Package}
                tone="warning"
                emphasize={(summary?.lowStockMaterialsCount ?? 0) > 0}
                hint={t("kpis.lowStockTrend")}
                loading={isLoading}
              />
            </RevealItem>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <RevealItem className="space-y-5 lg:col-span-2">
              <ProjectsTimeline />
              <FieldActivityFeed />
            </RevealItem>
            <RevealItem className="space-y-5">
              <CriticalAlertsWidget />
              <UpcomingMilestonesWidget />
            </RevealItem>
          </div>
        </Reveal>
      </main>

      {/* AI assistant + performance demos (Web Worker, SharedArrayBuffer) live in the floating widget */}
      <FloatingAIWidget />
    </>
  );
}
