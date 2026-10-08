"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, Plus, Play, CheckCircle2, Loader2, Building2, Wallet, HardHat } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DataTable } from "@/components/ui/data-table";
import { KpiCard } from "@/components/ui/kpi-card";
import { Reveal, RevealItem } from "@/components/ui/reveal";
import { fieldClass, primaryButtonClass } from "@/components/ui/form";
import { useProjects, useUpdateProject, Project, ProjectStatus, PROJECT_STATUSES } from "@/lib/projects-service";
import { useAlerts } from "@/lib/alerts-service";
import { useAuthStore } from "@/store/auth.store";
import { useFormatCOP } from "@/lib/format";
import { useApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/store/toast.store";
import { PROJECT_STATUS_CLASS } from "@/components/projects/project-status";


function progressColor(pct: number) {
  if (pct >= 75) return "bg-success";
  if (pct >= 40) return "bg-accent";
  return "bg-warning";
}

export default function ProjectsPage() {
  const t = useTranslations("projects");
  const tCommon = useTranslations("common");
  const formatCOP = useFormatCOP();
  const errorMessage = useApiErrorMessage();
  const isAdmin = useAuthStore((s) => s.user?.role === "ADMIN");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "ALL">("ALL");

  const { data, isLoading } = useProjects({ limit: 100 });
  const { data: activeAlerts } = useAlerts("ACTIVE");
  const updateProject = useUpdateProject();

  const projects = useMemo(() => data?.data ?? [], [data?.data]);
  // Set for O(1) "has alerts" lookups while rendering every row
  const alertedIds = useMemo(() => new Set((activeAlerts ?? []).map((a) => a.project.id)), [activeAlerts]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projects.filter(
      (p) =>
        (statusFilter === "ALL" || p.status === statusFilter) &&
        (p.name.toLowerCase().includes(query) || p.municipality.toLowerCase().includes(query))
    );
  }, [projects, search, statusFilter]);

  const totals = useMemo(
    () => ({
      total: projects.length,
      inProgress: projects.filter((p) => p.status === "IN_PROGRESS").length,
      budget: projects.reduce((sum, p) => sum + Number(p.budget), 0),
    }),
    [projects]
  );

  function handleStatusChange(projectId: string, status: ProjectStatus) {
    updateProject.mutate(
      { id: projectId, input: { status } },
      {
        onSuccess: () => toast.success(t("statusUpdated")),
        onError: (error) => toast.error(errorMessage(error)),
      }
    );
  }

  const pendingId = updateProject.isPending ? updateProject.variables?.id : undefined;

  const rowActions = (p: Project) => {
    const next = p.status === "PLANNED" ? "IN_PROGRESS" : p.status === "IN_PROGRESS" ? "FINISHED" : null;
    if (!next) return null;
    const busy = pendingId === p.id;
    const Icon = busy ? Loader2 : next === "IN_PROGRESS" ? Play : CheckCircle2;
    return (
      <button
        type="button"
        onClick={() => handleStatusChange(p.id, next)}
        disabled={busy}
        className={`inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-90 disabled:opacity-50 ${
          next === "IN_PROGRESS" ? "bg-success text-white" : "bg-ai text-bg"
        }`}
      >
        <Icon size={13} className={busy ? "animate-spin motion-reduce:animate-none" : ""} aria-hidden />
        {next === "IN_PROGRESS" ? t("markInProgress") : t("markFinished")}
      </button>
    );
  };

  return (
    <>
      <DashboardHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          isAdmin && (
            <Link href="/projects/new" className={primaryButtonClass}>
              <Plus size={15} aria-hidden /> {t("newProject")}
            </Link>
          )
        }
      />

      <main className="p-4 sm:p-6">
        <Reveal className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <RevealItem>
              <KpiCard label={t("totalProjects")} value={totals.total} icon={Building2} loading={isLoading} />
            </RevealItem>
            <RevealItem>
              <KpiCard
                label={t("inProgress")}
                value={totals.inProgress}
                icon={HardHat}
                tone="success"
                emphasize
                loading={isLoading}
              />
            </RevealItem>
            <RevealItem>
              <KpiCard
                label={t("totalBudget")}
                value={formatCOP(totals.budget, { compact: true })}
                hint={formatCOP(totals.budget)}
                icon={Wallet}
                tone="accent"
                loading={isLoading}
              />
            </RevealItem>
          </div>

          <RevealItem className="flex flex-col gap-2 sm:flex-row">
            <div className="relative sm:max-w-xs sm:flex-1">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
                aria-label={t("searchLabel")}
                className={`${fieldClass} bg-surface pl-9`}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | "ALL")}
              aria-label={t("statusFilterLabel")}
              className={`${fieldClass} bg-surface sm:w-56`}
            >
              <option value="ALL">{t("allStatuses")}</option>
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s}`)}
                </option>
              ))}
            </select>
          </RevealItem>

          <RevealItem>
            <DataTable<Project>
              rows={filtered}
              isLoading={isLoading}
              rowKey={(p) => p.id}
              emptyMessage={projects.length === 0 ? t("empty") : t("emptyFiltered")}
              emptyAction={
                isAdmin &&
                projects.length === 0 && (
                  <Link href="/projects/new" className={primaryButtonClass}>
                    <Plus size={15} aria-hidden /> {t("createFirst")}
                  </Link>
                )
              }
              rowActions={rowActions}
              actionsHeader={t("actions")}
              columns={[
                {
                  id: "name",
                  header: t("fields.name"),
                  primary: true,
                  accessor: (p) => (
                    <Link href={`/projects/${p.id}`} className="flex items-center gap-2 font-medium text-ink hover:text-accent">
                      {alertedIds.has(p.id) && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-critical" title={t("hasAlerts")}>
                          <span className="sr-only">{t("hasAlerts")}</span>
                        </span>
                      )}
                      {p.name}
                    </Link>
                  ),
                },
                { id: "municipality", header: t("fields.municipality"), accessor: (p) => p.municipality },
                {
                  id: "type",
                  header: t("fields.type"),
                  accessor: (p) => (
                    <span className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-xs text-ink">
                      {t(`types.${p.type}`)}
                    </span>
                  ),
                },
                {
                  id: "progress",
                  header: t("fields.progress"),
                  accessor: (p) => (
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                        <div
                          className={`h-full rounded-full ${progressColor(p.progressPercentage)}`}
                          style={{ width: `${Math.min(100, p.progressPercentage)}%` }}
                        />
                      </div>
                      <span className="font-mono-data text-xs">{p.progressPercentage}%</span>
                    </div>
                  ),
                },
                {
                  id: "budget",
                  header: t("fields.budget"),
                  align: "right",
                  accessor: (p) => <span className="font-mono-data">{formatCOP(p.budget)}</span>,
                },
                {
                  id: "status",
                  header: t("fields.status"),
                  accessor: (p) => (
                    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${PROJECT_STATUS_CLASS[p.status]}`}>
                      {t(`status.${p.status}`)}
                    </span>
                  ),
                },
                {
                  id: "responsible",
                  header: t("fields.responsible"),
                  accessor: (p) => p.responsible?.name ?? tCommon("noData"),
                },
              ]}
            />
          </RevealItem>
        </Reveal>
      </main>
    </>
  );
}
