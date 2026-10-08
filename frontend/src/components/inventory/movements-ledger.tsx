"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Download, TriangleAlert } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { fieldClass, secondaryButtonClass } from "@/components/ui/form";
import { ProjectSelect } from "@/components/projects/project-select";
import { ExpenseStatusBadge } from "@/components/finance/expense-status-badge";
import { Link } from "@/i18n/navigation";
import { useMaterials, useMovements } from "@/lib/materials-service";
import { apiClient } from "@/lib/api-client";
import { exportCsv, type CsvValue } from "@/lib/export-csv";
import { useFormatCOP } from "@/lib/format";
import { useApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/store/toast.store";
import type { Paginated } from "@/types/finance";
import type { InventoryMovement, MovementFilters } from "@/types/inventory";

const PAGE_SIZE = 15;
const EXPORT_PAGE_SIZE = 100;
const EXPORT_MAX_PAGES = 30;

/** Append-only ledger with filters, rejected-expense warnings and CSV export. */
export function MovementsLedger({ fixedMaterialId }: { fixedMaterialId?: string }) {
  const t = useTranslations("inventory");
  const tCurrency = useTranslations("reports");
  const tCommon = useTranslations("common");
  const tList = useTranslations("expense.list");
  const format = useFormatter();
  const formatCOP = useFormatCOP();
  const errorMessage = useApiErrorMessage();

  const [filters, setFilters] = useState<MovementFilters>({ materialId: fixedMaterialId, page: 1, limit: PAGE_SIZE });
  const [exporting, setExporting] = useState(false);
  const { data, isLoading, isFetching } = useMovements(filters);
  const { data: materials } = useMaterials({ sort: "name", limit: 200 });
  const update = (patch: Partial<MovementFilters>) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));
  const qty = (v: number) => format.number(v, { maximumFractionDigits: 2 });

  async function handleExport() {
    setExporting(true);
    try {
      const rows: InventoryMovement[] = [];
      for (let page = 1; page <= EXPORT_MAX_PAGES; page++) {
        const { data: res } = await apiClient.get<Paginated<InventoryMovement>>("/materials/movements", {
          params: { ...filters, page, limit: EXPORT_PAGE_SIZE },
        });
        rows.push(...res.data);
        if (page >= res.pagination.totalPages) break;
      }
      const body: CsvValue[][] = rows.map((m) => [
        m.date.slice(0, 10),
        t(`movementType.${m.type}`),
        m.material.name,
        m.type === "OUT" ? -m.quantity : m.quantity,
        m.material.unit,
        m.project?.name ?? t("ledger.noProject"),
        m.registeredBy?.name,
        m.supplier?.name,
        m.unitCost,
        "COP",
        m.expense?.id ?? "",
        m.warning ? t("ledger.warning") : "",
        m.notes,
      ]);
      exportCsv(
        `obraiq-movimientos-${new Date().toISOString().slice(0, 10)}`,
        [
          t("fields.lastMovement"),
          t("movement.type"),
          t("fields.material"),
          t("movement.quantity"),
          t("fields.unit"),
          t("movement.project"),
          t("ledger.registeredBy"),
          t("movement.supplier"),
          t("ledger.unitCost"),
          tCurrency("csvCurrency"),
          t("ledger.linkedExpense"),
          t("ledger.warning"),
          t("movement.notes"),
        ],
        body
      );
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setExporting(false);
    }
  }

  const pagination = data?.pagination;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">{t("ledger.title")}</h2>
          <p className="text-xs text-ink-muted">{t("ledger.subtitle")}</p>
        </div>
        <button type="button" onClick={handleExport} disabled={exporting || !data?.data.length} className={secondaryButtonClass}>
          <Download size={15} aria-hidden /> {exporting ? tCommon("loading") : t("ledger.export")}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {!fixedMaterialId && (
          <select
            aria-label={t("fields.material")}
            value={filters.materialId ?? ""}
            onChange={(e) => update({ materialId: e.target.value || undefined })}
            className={`${fieldClass} bg-surface`}
          >
            <option value="">{t("ledger.allMaterials")}</option>
            {materials?.data.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        )}
        <ProjectSelect
          allowNone
          noneLabel={t("ledger.allProjects")}
          aria-label={t("movement.project")}
          value={filters.projectId ?? ""}
          onChange={(e) => update({ projectId: e.target.value || undefined })}
          className={`${fieldClass} bg-surface`}
        />
        <select
          aria-label={t("movement.type")}
          value={filters.type ?? ""}
          onChange={(e) => update({ type: (e.target.value || undefined) as MovementFilters["type"] })}
          className={`${fieldClass} bg-surface`}
        >
          <option value="">{t("ledger.allTypes")}</option>
          <option value="IN">{t("movementType.IN")}</option>
          <option value="OUT">{t("movementType.OUT")}</option>
        </select>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm text-ink sm:min-h-10">
          <input
            type="checkbox"
            checked={filters.warnings === "true"}
            onChange={(e) => update({ warnings: e.target.checked ? "true" : undefined })}
            className="h-4 w-4 accent-[var(--critical)]"
          />
          <TriangleAlert size={14} className="text-critical" aria-hidden /> {t("ledger.onlyWarnings")}
        </label>
      </div>

      <div className={isFetching && !isLoading ? "opacity-70 transition-opacity" : ""}>
        <DataTable<InventoryMovement>
          rows={data?.data ?? []}
          isLoading={isLoading}
          rowKey={(m) => m.id}
          emptyMessage={t("ledger.empty")}
          columns={[
            {
              id: "material",
              header: t("fields.material"),
              primary: true,
              accessor: (m) => (
                <div className="min-w-0">
                  <Link href={`/materials/${m.material.id}`} className="block truncate font-medium text-ink hover:text-accent">
                    {m.material.name}
                  </Link>
                  {m.notes && <p className="truncate text-xs text-ink-muted">{m.notes}</p>}
                  {m.warning && (
                    <p className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-critical/15 px-2 py-0.5 text-[11px] font-medium text-critical" title={t("ledger.warningHint")}>
                      <TriangleAlert size={11} aria-hidden /> {t("ledger.warning")}
                    </p>
                  )}
                </div>
              ),
            },
            {
              id: "date",
              header: t("fields.lastMovement"),
              accessor: (m) => (
                <span className="whitespace-nowrap">{format.dateTime(new Date(m.date), { day: "numeric", month: "short", year: "numeric" })}</span>
              ),
            },
            {
              id: "qty",
              header: t("movement.quantity"),
              align: "right",
              accessor: (m) => (
                <span className={`whitespace-nowrap font-mono-data font-semibold ${m.type === "IN" ? "text-success" : "text-accent"}`}>
                  {m.type === "IN" ? "+" : "−"}
                  {qty(m.quantity)} <span className="text-xs font-normal text-ink-muted">{m.material.unit}</span>
                </span>
              ),
            },
            {
              id: "project",
              header: t("movement.project"),
              accessor: (m) =>
                m.project ? (
                  <Link href={`/projects/${m.project.id}`} className="line-clamp-2 hover:text-accent">
                    {m.project.name}
                  </Link>
                ) : (
                  <span className="text-ink-muted">{t("ledger.noProject")}</span>
                ),
            },
            { id: "by", header: t("ledger.registeredBy"), accessor: (m) => m.registeredBy?.name ?? tCommon("noData") },
            {
              id: "link",
              header: t("ledger.linkedExpense"),
              accessor: (m) =>
                m.expense ? (
                  <Link href="/expenses" className="inline-flex items-center gap-1.5 hover:text-accent" title={m.expense.description ?? undefined}>
                    <ExpenseStatusBadge status={m.expense.status} />
                  </Link>
                ) : m.supplier ? (
                  <span className="text-xs text-ink-muted">{m.supplier.name}</span>
                ) : (
                  <span className="text-ink-muted">—</span>
                ),
            },
            {
              id: "cost",
              header: t("ledger.unitCost"),
              align: "right",
              accessor: (m) =>
                m.unitCost != null ? <span className="whitespace-nowrap font-mono-data">{formatCOP(m.unitCost)}</span> : <span className="text-ink-muted">—</span>,
            },
          ]}
        />
      </div>

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
    </section>
  );
}
