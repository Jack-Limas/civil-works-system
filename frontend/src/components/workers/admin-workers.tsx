"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Briefcase, Pencil, Plus, Power, PowerOff, Search, UserCheck, UserMinus, UserX, X } from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DataTable } from "@/components/ui/data-table";
import { KpiCard } from "@/components/ui/kpi-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Pagination } from "@/components/ui/pagination";
import { Reveal, RevealItem } from "@/components/ui/reveal";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/form";
import { useProjects } from "@/lib/projects-service";
import { useSetWorkerActive, useWorkerDirectory, type Worker, type WorkerFilters, type WorkerStatus } from "@/lib/workers-service";
import { useApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/store/toast.store";
import { WorkerForm } from "./worker-form";
import { WorkerStatusBadge } from "./worker-status-badge";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;
const UNASSIGNED = "__none__";
const n = (v: number) => String(Math.round(v));

/** Admin directory: KPIs, filters, create/edit and activate/deactivate (workers are never deleted). */
export function AdminWorkers() {
  const t = useTranslations("workers");
  const tf = useTranslations("workers.filters");
  const tCommon = useTranslations("common");
  const errorMessage = useApiErrorMessage();
  const setActive = useSetWorkerActive();
  const { data: projects } = useProjects({ limit: 100 });
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<WorkerFilters>({ page: 1, limit: PAGE_SIZE });
  const [form, setForm] = useState<{ worker: Worker | null } | null>(null);
  const [confirm, setConfirm] = useState<Worker | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setFilters((f) => ({ ...f, search: search.trim() || undefined, page: 1 })), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isFetching } = useWorkerDirectory(filters);
  const update = (patch: Partial<WorkerFilters>) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));
  const kpis = data?.summary;
  const positions = kpis?.positions.map((p) => p.position) ?? [];
  const filtered = !!(filters.search || filters.projectId || filters.assignment || filters.position || filters.status);

  async function toggleActive() {
    if (!confirm) return;
    const activating = confirm.status === "INACTIVE";
    try {
      await setActive.mutateAsync({ id: confirm.id, active: activating });
      toast.success(activating ? t("toasts.activated") : t("toasts.deactivated"));
      setConfirm(null);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <>
      <DashboardHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <button type="button" onClick={() => setForm({ worker: null })} className={primaryButtonClass}>
            <Plus size={16} aria-hidden /> {t("newWorker")}
          </button>
        }
      />
      <main className="space-y-5 p-4 sm:p-6">
        <Reveal className="space-y-5">
          <RevealItem>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <KpiCard label={t("kpis.active")} icon={UserCheck} tone="success" loading={isLoading} value={<AnimatedNumber value={kpis?.active ?? 0} format={n} />} />
              <KpiCard label={t("kpis.inactive")} icon={UserX} tone="neutral" loading={isLoading} value={<AnimatedNumber value={kpis?.inactive ?? 0} format={n} />} />
              <KpiCard
                label={t("kpis.unassigned")}
                icon={UserMinus}
                tone="warning"
                emphasize={(kpis?.unassigned ?? 0) > 0}
                loading={isLoading}
                value={<AnimatedNumber value={kpis?.unassigned ?? 0} format={n} />}
              />
              <KpiCard
                label={t("kpis.positions")}
                icon={Briefcase}
                tone="accent"
                loading={isLoading}
                value={<AnimatedNumber value={positions.length} format={n} />}
                hint={t("kpis.positionsHint", { count: positions.length })}
              />
            </div>
          </RevealItem>

          <RevealItem>
            <div className="grid grid-cols-1 gap-2 rounded-xl border border-line bg-surface p-3 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_auto]">
              <div className="relative sm:col-span-2 xl:col-span-1">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden />
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tf("search")} aria-label={tf("search")} className={`${fieldClass} pl-10`} />
              </div>
              <select
                aria-label={t("cols.project")}
                value={filters.assignment === "none" ? UNASSIGNED : (filters.projectId ?? "")}
                onChange={(e) => {
                  const v = e.target.value;
                  update(v === UNASSIGNED ? { assignment: "none", projectId: undefined } : { assignment: undefined, projectId: v || undefined });
                }}
                className={fieldClass}
              >
                <option value="">{tf("allProjects")}</option>
                <option value={UNASSIGNED}>{tf("unassigned")}</option>
                {projects?.data.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select aria-label={t("position")} value={filters.position ?? ""} onChange={(e) => update({ position: e.target.value || undefined })} className={fieldClass}>
                <option value="">{tf("allPositions")}</option>
                {kpis?.positions.map((p) => (
                  <option key={p.position} value={p.position}>
                    {p.position} ({p.count})
                  </option>
                ))}
              </select>
              <select
                aria-label={t("status")}
                value={filters.status ?? ""}
                onChange={(e) => update({ status: (e.target.value || undefined) as WorkerStatus | undefined })}
                className={fieldClass}
              >
                <option value="">{tf("allStatuses")}</option>
                <option value="ACTIVE">{t("statuses.ACTIVE")}</option>
                <option value="INACTIVE">{t("statuses.INACTIVE")}</option>
              </select>
              {filtered && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setFilters({ page: 1, limit: PAGE_SIZE });
                  }}
                  className={secondaryButtonClass}
                >
                  <X size={15} aria-hidden /> {tf("clear")}
                </button>
              )}
            </div>
          </RevealItem>

          <RevealItem className={isFetching && !isLoading ? "opacity-70 transition-opacity" : ""}>
            <DataTable<Worker>
              rows={data?.data ?? []}
              isLoading={isLoading}
              rowKey={(w) => w.id}
              emptyMessage={filtered ? t("emptyFiltered") : t("emptyAction")}
              emptyAction={
                !filtered ? (
                  <button type="button" onClick={() => setForm({ worker: null })} className={primaryButtonClass}>
                    <Plus size={16} aria-hidden /> {t("newWorker")}
                  </button>
                ) : undefined
              }
              actionsHeader={tCommon("actions")}
              rowActions={(w) => (
                <div className="flex justify-end gap-1.5">
                  <button type="button" onClick={() => setForm({ worker: w })} className={secondaryButtonClass} aria-label={`${t("actions.edit")}: ${w.name}`} title={t("actions.edit")}>
                    <Pencil size={15} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirm(w)}
                    className={secondaryButtonClass}
                    aria-label={`${w.status === "ACTIVE" ? t("actions.deactivate") : t("actions.activate")}: ${w.name}`}
                    title={w.status === "ACTIVE" ? t("actions.deactivate") : t("actions.activate")}
                  >
                    {w.status === "ACTIVE" ? <PowerOff size={15} className="text-critical" aria-hidden /> : <Power size={15} className="text-success" aria-hidden />}
                  </button>
                </div>
              )}
              columns={[
                {
                  id: "worker",
                  header: t("cols.worker"),
                  primary: true,
                  accessor: (w) => (
                    <div className="min-w-0">
                      <p className={`truncate font-medium ${w.status === "ACTIVE" ? "text-ink" : "text-ink-muted"}`}>{w.name}</p>
                      <p className="font-mono-data text-xs text-ink-muted">{w.documentId}</p>
                    </div>
                  ),
                },
                { id: "position", header: t("cols.position"), accessor: (w) => w.position },
                {
                  id: "project",
                  header: t("cols.project"),
                  accessor: (w) => (w.project ? <span className="line-clamp-2">{w.project.name}</span> : <span className="text-warning">{t("unassigned")}</span>),
                },
                { id: "phone", header: t("cols.phone"), accessor: (w) => (w.phone ? <span className="whitespace-nowrap font-mono-data">{w.phone}</span> : <span className="text-ink-muted">—</span>) },
                { id: "status", header: t("cols.status"), accessor: (w) => <WorkerStatusBadge status={w.status} /> },
              ]}
            />
          </RevealItem>
        </Reveal>
        {data && <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onChange={(page) => update({ page })} />}
      </main>

      <Modal open={form !== null} onClose={() => setForm(null)} title={form?.worker ? t("form.editTitle") : t("form.createTitle")} size="lg">
        {form && <WorkerForm key={form.worker?.id ?? "new"} worker={form.worker} positions={positions} onDone={() => setForm(null)} onCancel={() => setForm(null)} />}
      </Modal>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm ? (confirm.status === "ACTIVE" ? t("confirm.deactivateTitle", { name: confirm.name }) : t("confirm.activateTitle", { name: confirm.name })) : ""}
        confirmLabel={t("confirm.confirm")}
        cancelLabel={t("confirm.cancel")}
        tone={confirm?.status === "ACTIVE" ? "critical" : "accent"}
        busy={setActive.isPending}
        onConfirm={toggleActive}
        onClose={() => setConfirm(null)}
      >
        <p>{confirm?.status === "ACTIVE" ? t("confirm.deactivateBody") : t("confirm.activateBody")}</p>
      </ConfirmDialog>
    </>
  );
}
