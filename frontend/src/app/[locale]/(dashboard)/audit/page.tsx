"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Clock, Download, Eye, X } from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { AdminOnly } from "@/components/auth/admin-only";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { Reveal, RevealItem } from "@/components/ui/reveal";
import { fieldClass, secondaryButtonClass } from "@/components/ui/form";
import { AuditDetail } from "@/components/audit/audit-detail";
import { actionTone, useAuditLabels } from "@/components/audit/audit-labels";
import { useAuditValues } from "@/components/audit/use-audit-values";
import {
  AUDIT_ENTITY_TYPES,
  fetchAuditExport,
  useAuditActions,
  useAuditLogs,
  type AuditEntityType,
  type AuditFilters,
  type AuditLogEntry,
} from "@/lib/audit-service";
import { useUserDirectory } from "@/lib/users-service";
import { exportCsv } from "@/lib/export-csv";
import { useApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/store/toast.store";

const PAGE_SIZE = 25;
const UUID = /^[0-9a-f-]{36}$/i;

function AuditScreen() {
  const t = useTranslations("audit");
  const tf = useTranslations("audit.filters");
  const tCsv = useTranslations("csv");
  const errorMessage = useApiErrorMessage();
  const labels = useAuditLabels();
  const values = useAuditValues();
  const params = useSearchParams();
  // Deep link from the user detail ("see in history"): start filtered by that user
  const [filters, setFilters] = useState<AuditFilters>(() => {
    const actorId = params.get("actorId");
    return { page: 1, limit: PAGE_SIZE, ...(actorId && UUID.test(actorId) && { actorId }) };
  });
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);
  const [exporting, setExporting] = useState(false);

  const { data, isLoading, isFetching } = useAuditLogs(filters);
  const { data: actions } = useAuditActions();
  const { data: users } = useUserDirectory({ limit: 200 });
  const update = (patch: Partial<AuditFilters>) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));
  const filtered = !!(filters.actorId || filters.action || filters.entityType || filters.from || filters.to);

  async function handleExport() {
    setExporting(true);
    try {
      const result = await fetchAuditExport({
        actorId: filters.actorId,
        action: filters.action,
        entityType: filters.entityType,
        from: filters.from,
        to: filters.to,
      });
      exportCsv(
        `obraiq-${tCsv("audit")}-${new Date().toISOString().slice(0, 10)}`,
        [t("cols.date"), t("cols.user"), t("detail.who"), t("cols.action"), t("cols.entity"), t("detail.entity"), t("cols.detail"), t("cols.ip")],
        result.data.map((e) => [
          e.createdAt,
          labels.actor(e),
          e.actorEmail,
          labels.action(e.action),
          labels.entity(e.entityType),
          e.entityId ?? "",
          values.summary(e),
          e.ip ?? "",
        ])
      );
      if (result.truncated) toast.info(t("exportTruncated", { count: result.data.length }));
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <DashboardHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <button type="button" onClick={handleExport} disabled={exporting || !data?.data.length} className={secondaryButtonClass}>
            <Download size={15} aria-hidden /> {exporting ? t("exporting") : t("export")}
          </button>
        }
      />
      <main className="space-y-5 p-4 sm:p-6">
        <Reveal className="space-y-5">
          <RevealItem>
            <div className="space-y-2 rounded-xl border border-line bg-surface p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <select aria-label={tf("user")} value={filters.actorId ?? ""} onChange={(e) => update({ actorId: e.target.value || undefined })} className={fieldClass}>
                  <option value="">{tf("allUsers")}</option>
                  {users?.data.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <select aria-label={tf("action")} value={filters.action ?? ""} onChange={(e) => update({ action: e.target.value || undefined })} className={fieldClass}>
                  <option value="">{tf("allActions")}</option>
                  {actions?.map((a) => (
                    <option key={a.action} value={a.action}>
                      {labels.action(a.action)} ({a.count})
                    </option>
                  ))}
                </select>
                <select
                  aria-label={tf("entity")}
                  value={filters.entityType ?? ""}
                  onChange={(e) => update({ entityType: (e.target.value || undefined) as AuditEntityType | undefined })}
                  className={fieldClass}
                >
                  <option value="">{tf("allEntities")}</option>
                  {AUDIT_ENTITY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {labels.entity(type)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
                <label className="flex flex-col gap-1 text-xs font-medium text-ink-muted">
                  {tf("from")}
                  <input type="date" value={filters.from ?? ""} max={filters.to} onChange={(e) => update({ from: e.target.value || undefined })} className={fieldClass} />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-ink-muted">
                  {tf("to")}
                  <input type="date" value={filters.to ?? ""} min={filters.from} onChange={(e) => update({ to: e.target.value || undefined })} className={fieldClass} />
                </label>
                <p className="col-span-2 flex items-center gap-1.5 pb-2 text-xs text-ink-muted sm:col-span-1">
                  <Clock size={13} aria-hidden /> {t("timezone")}
                </p>
                {filtered && (
                  <button type="button" onClick={() => setFilters({ page: 1, limit: PAGE_SIZE })} className={`${secondaryButtonClass} col-span-2 sm:col-span-1`}>
                    <X size={15} aria-hidden /> {tf("clear")}
                  </button>
                )}
              </div>
            </div>
          </RevealItem>

          <RevealItem className={isFetching && !isLoading ? "opacity-70 transition-opacity" : ""}>
            <DataTable<AuditLogEntry>
              rows={data?.data ?? []}
              isLoading={isLoading}
              rowKey={(e) => e.id}
              emptyMessage={filtered ? t("empty") : t("emptyAll")}
              actionsHeader={t("cols.detail")}
              rowActions={(e) => (
                <button type="button" onClick={() => setSelected(e)} className={secondaryButtonClass} aria-label={`${t("viewDetail")}: ${labels.action(e.action)}`} title={t("viewDetail")}>
                  <Eye size={15} aria-hidden />
                </button>
              )}
              columns={[
                {
                  id: "action",
                  header: t("cols.action"),
                  primary: true,
                  accessor: (e) => (
                    <button type="button" onClick={() => setSelected(e)} className="flex min-w-0 items-start gap-2 text-left">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${actionTone(e.action)}`} aria-hidden />
                      <span className="min-w-0">
                        <span className="block font-medium text-ink hover:text-accent">{labels.action(e.action)}</span>
                        <span className="line-clamp-1 text-xs text-ink-muted">{values.summary(e)}</span>
                      </span>
                    </button>
                  ),
                },
                { id: "date", header: t("cols.date"), accessor: (e) => <span className="whitespace-nowrap">{labels.moment(e.createdAt)}</span> },
                {
                  id: "user",
                  header: t("cols.user"),
                  accessor: (e) => (
                    <span className="min-w-0">
                      <span className="block truncate">{labels.actor(e)}</span>
                      {e.actor && <span className="block truncate text-xs text-ink-muted">{e.actorEmail}</span>}
                    </span>
                  ),
                },
                { id: "entity", header: t("cols.entity"), accessor: (e) => labels.entity(e.entityType) },
                { id: "ip", header: t("cols.ip"), accessor: (e) => <span className="font-mono-data text-xs text-ink-muted">{e.ip ?? "—"}</span> },
              ]}
            />
          </RevealItem>
        </Reveal>
        {data && <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onChange={(page) => update({ page })} />}
      </main>

      <Modal open={selected !== null} onClose={() => setSelected(null)} title={t("detail.title")} size="lg">
        {selected && <AuditDetail entry={selected} />}
      </Modal>
    </>
  );
}

/** System history (CSR, admin only): read-only, filterable, exportable. */
export default function AuditPage() {
  return (
    <AdminOnly>
      <Suspense fallback={<div className="m-6 h-64 animate-pulse rounded-xl bg-surface motion-reduce:animate-none" aria-busy="true" />}>
        <AuditScreen />
      </Suspense>
    </AdminOnly>
  );
}
