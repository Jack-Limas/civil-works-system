"use client";

import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { CheckCircle2, Eye, Flame, Plus, Search, Siren, TimerReset, X } from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DataTable } from "@/components/ui/data-table";
import { KpiCard } from "@/components/ui/kpi-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Pagination } from "@/components/ui/pagination";
import { Reveal, RevealItem } from "@/components/ui/reveal";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/form";
import { ProjectSelect } from "@/components/projects/project-select";
import {
  INCIDENT_PRIORITIES,
  INCIDENT_STATUSES,
  INCIDENT_TYPES,
  useIncidentList,
  type Incident,
  type IncidentFilters,
  type IncidentPriority,
  type IncidentStatus,
  type IncidentType,
} from "@/lib/incidents-service";
import { IncidentPriorityBadge, IncidentStatusBadge, IncidentTypeIcon } from "./incident-badges";

const PAGE_SIZE = 15;
const SEARCH_DEBOUNCE_MS = 300;
const n = (v: number) => String(Math.round(v));

/** Admin view: KPIs, every filter, table (cards on phones) and detail/report modals owned by the page. */
export function AdminIncidents({ onOpen, onReport }: { onOpen: (id: string) => void; onReport: () => void }) {
  const t = useTranslations("incidents");
  const tf = useTranslations("incidents.filters");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<IncidentFilters>({ state: "active", sort: "priority", page: 1, limit: PAGE_SIZE });

  // Debounced search: the timer callback (not the effect body) updates state
  useEffect(() => {
    const timer = setTimeout(() => setFilters((f) => ({ ...f, search: search.trim() || undefined, page: 1 })), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isFetching } = useIncidentList(filters);
  const update = (patch: Partial<IncidentFilters>) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));
  const kpis = data?.summary;
  const statusValue = filters.status ?? (filters.state === "active" ? "active" : "");
  const filtered = !!(filters.projectId || filters.priority || filters.type || filters.from || filters.to || filters.search || filters.status);

  return (
    <>
      <DashboardHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <button type="button" onClick={onReport} className={primaryButtonClass}>
            <Plus size={16} aria-hidden /> {t("newIncident")}
          </button>
        }
      />
      <main className="space-y-5 p-4 sm:p-6">
        <Reveal className="space-y-5">
          <RevealItem>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <KpiCard label={t("kpis.open")} icon={Siren} tone="critical" loading={isLoading} value={<AnimatedNumber value={kpis?.open ?? 0} format={n} />} hint={t("kpis.openHint")} />
              <KpiCard label={t("kpis.inProgress")} icon={TimerReset} tone="warning" loading={isLoading} value={<AnimatedNumber value={kpis?.inProgress ?? 0} format={n} />} hint={t("kpis.inProgressHint")} />
              <KpiCard
                label={t("kpis.highActive")}
                icon={Flame}
                tone="critical"
                emphasize={(kpis?.highActive ?? 0) > 0}
                loading={isLoading}
                value={<AnimatedNumber value={kpis?.highActive ?? 0} format={n} />}
                hint={t("kpis.highActiveHint")}
              />
              <KpiCard label={t("kpis.resolvedMonth")} icon={CheckCircle2} tone="success" loading={isLoading} value={<AnimatedNumber value={kpis?.resolvedThisMonth ?? 0} format={n} />} />
            </div>
          </RevealItem>

          <RevealItem>
            <div className="space-y-2 rounded-xl border border-line bg-surface p-3">
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={tf("search")}
                  aria-label={tf("search")}
                  className={`${fieldClass} pl-10`}
                />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <ProjectSelect
                  allowNone
                  noneLabel={tf("allProjects")}
                  aria-label={t("cols.project")}
                  value={filters.projectId ?? ""}
                  onChange={(e) => update({ projectId: e.target.value || undefined })}
                  className={fieldClass}
                />
                <select
                  aria-label={t("cols.status")}
                  value={statusValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    update(v === "active" ? { state: "active", status: undefined } : { state: undefined, status: (v || undefined) as IncidentStatus | undefined });
                  }}
                  className={fieldClass}
                >
                  <option value="active">{tf("active")}</option>
                  <option value="">{tf("allStatuses")}</option>
                  {INCIDENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {t(`statuses.${s}`)}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={t("cols.priority")}
                  value={filters.priority ?? ""}
                  onChange={(e) => update({ priority: (e.target.value || undefined) as IncidentPriority | undefined })}
                  className={fieldClass}
                >
                  <option value="">{tf("allPriorities")}</option>
                  {INCIDENT_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {t(`priorities.${p}`)}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={t("cols.type")}
                  value={filters.type ?? ""}
                  onChange={(e) => update({ type: (e.target.value || undefined) as IncidentType | undefined })}
                  className={fieldClass}
                >
                  <option value="">{tf("allTypes")}</option>
                  {INCIDENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(`types.${type}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <label className="flex flex-col gap-1 text-xs font-medium text-ink-muted">
                  {tf("from")}
                  <input type="date" value={filters.from ?? ""} max={filters.to} onChange={(e) => update({ from: e.target.value || undefined })} className={fieldClass} />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-ink-muted">
                  {tf("to")}
                  <input type="date" value={filters.to ?? ""} min={filters.from} onChange={(e) => update({ to: e.target.value || undefined })} className={fieldClass} />
                </label>
                <label className="col-span-2 flex flex-col gap-1 text-xs font-medium text-ink-muted sm:col-span-1">
                  {tf("sort")}
                  <select value={filters.sort} onChange={(e) => update({ sort: e.target.value as "priority" | "date" })} className={fieldClass}>
                    <option value="priority">{tf("sortPriority")}</option>
                    <option value="date">{tf("sortDate")}</option>
                  </select>
                </label>
                {filtered && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setFilters({ state: "active", sort: filters.sort, page: 1, limit: PAGE_SIZE });
                    }}
                    className={`${secondaryButtonClass} col-span-2 self-end sm:col-span-1`}
                  >
                    <X size={15} aria-hidden /> {tf("clear")}
                  </button>
                )}
              </div>
            </div>
          </RevealItem>

          <RevealItem className={isFetching && !isLoading ? "opacity-70 transition-opacity" : ""}>
            <DataTable<Incident>
              rows={data?.data ?? []}
              isLoading={isLoading}
              rowKey={(i) => i.id}
              emptyMessage={filtered ? t("emptyFiltered") : t("emptyAction")}
              emptyAction={
                !filtered ? (
                  <button type="button" onClick={onReport} className={primaryButtonClass}>
                    <Plus size={16} aria-hidden /> {t("newIncident")}
                  </button>
                ) : undefined
              }
              actionsHeader={tCommon("actions")}
              rowActions={(i) => (
                <button type="button" onClick={() => onOpen(i.id)} className={secondaryButtonClass} aria-label={`${t("detail.title")}: ${t(`types.${i.type}`)}`}>
                  <Eye size={15} aria-hidden />
                </button>
              )}
              columns={[
                {
                  id: "incident",
                  header: t("cols.incident"),
                  primary: true,
                  accessor: (i) => (
                    <button type="button" onClick={() => onOpen(i.id)} className="flex min-w-0 items-start gap-2.5 text-left">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-muted">
                        <IncidentTypeIcon type={i.type} size={16} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-ink hover:text-accent">{t(`types.${i.type}`)}</span>
                        <span className="line-clamp-2 text-xs text-ink-muted">{i.description}</span>
                        {!!i._count?.evidence && <span className="text-[11px] text-ink-muted">{t("photosCount", { count: i._count.evidence })}</span>}
                      </span>
                    </button>
                  ),
                },
                { id: "project", header: t("cols.project"), accessor: (i) => <span className="line-clamp-2">{i.project?.name}</span> },
                { id: "priority", header: t("cols.priority"), accessor: (i) => <IncidentPriorityBadge priority={i.priority} /> },
                { id: "status", header: t("cols.status"), accessor: (i) => <IncidentStatusBadge status={i.status} /> },
                {
                  id: "date",
                  header: t("cols.date"),
                  accessor: (i) => <span className="whitespace-nowrap">{format.dateTime(new Date(i.date), { day: "numeric", month: "short", year: "numeric" })}</span>,
                },
                { id: "reportedBy", header: t("cols.reportedBy"), accessor: (i) => i.reportedBy?.name ?? "—" },
              ]}
            />
          </RevealItem>
        </Reveal>

        {data && <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onChange={(page) => update({ page })} />}
      </main>
    </>
  );
}
