"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Download, FileText } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { fieldClass, secondaryButtonClass } from "@/components/ui/form";
import { ProjectSelect } from "@/components/projects/project-select";
import { ExpenseStatusBadge } from "./expense-status-badge";
import { ReviewExpenseActions } from "./review-expense-actions";
import { useExpensesList } from "@/lib/expenses-service";
import { apiClient } from "@/lib/api-client";
import { exportCsv, CsvValue } from "@/lib/export-csv";
import { useFormatCOP } from "@/lib/format";
import { useApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/store/toast.store";
import { useAuthStore } from "@/store/auth.store";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_STATUSES,
  ExpenseCategory,
  ExpenseFilters,
  ExpenseRecord,
  ExpenseStatus,
  Paginated,
} from "@/types/finance";

const PAGE_SIZE = 15;
/** CSV export walks the filtered result in pages of the API maximum. */
const EXPORT_PAGE_SIZE = 100;
const EXPORT_MAX_PAGES = 20;

const compactSelect = `${fieldClass} bg-surface`;

export function ExpensesTable({ initialStatus }: { initialStatus?: ExpenseStatus }) {
  const t = useTranslations("expense");
  const tCategories = useTranslations("expenses.categories");
  const tFinance = useTranslations("finance");
  const tCsv = useTranslations("csv");
  const tCashflow = useTranslations("cashflow");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const formatCOP = useFormatCOP();
  const errorMessage = useApiErrorMessage();
  const isAdmin = useAuthStore((s) => s.user?.role === "ADMIN");

  const [filters, setFilters] = useState<ExpenseFilters>({ status: initialStatus, page: 1, limit: PAGE_SIZE });
  const [exporting, setExporting] = useState(false);
  const { data, isLoading, isFetching } = useExpensesList(filters);

  const update = (patch: Partial<ExpenseFilters>) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));

  const payer = (e: ExpenseRecord) =>
    !e.registeredBy || e.registeredBy.role === "ADMIN" ? tFinance("recent.companyPayment") : e.registeredBy.name;

  async function handleExport() {
    setExporting(true);
    try {
      const rows: ExpenseRecord[] = [];
      for (let page = 1; page <= EXPORT_MAX_PAGES; page++) {
        const { data: res } = await apiClient.get<Paginated<ExpenseRecord>>("/expenses", {
          params: { ...filters, page, limit: EXPORT_PAGE_SIZE },
        });
        rows.push(...res.data);
        if (page >= res.pagination.totalPages) break;
      }
      const headers = [
        t("fields.date"),
        t("fields.project"),
        t("fields.category"),
        t("fields.supplier"),
        t("fields.description"),
        t("fields.invoiceNumber"),
        t("fields.paymentMethod"),
        t("fields.registeredBy"),
        t("fields.status"),
        t("fields.amount"),
        t("fields.support"),
      ];
      const body: CsvValue[][] = rows.map((e) => [
        e.date.slice(0, 10),
        e.project.name,
        tCategories(e.category),
        e.supplier?.name,
        e.description,
        e.invoiceNumber,
        e.paymentMethod ? t(`paymentMethods.${e.paymentMethod}`) : "",
        payer(e),
        t(`status.${e.status}`),
        Number(e.amount),
        e.supportUrl,
      ]);
      exportCsv(`obraiq-${tCsv("expenses")}-${new Date().toISOString().slice(0, 10)}`, headers, body);
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
        <h2 className="text-base font-semibold text-ink">{t("list.title")}</h2>
        <button type="button" onClick={handleExport} disabled={exporting || !data?.data.length} className={secondaryButtonClass}>
          <Download size={15} aria-hidden /> {exporting ? tCommon("loading") : t("list.export")}
        </button>
      </div>

      <fieldset className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <legend className="sr-only">{t("list.filters")}</legend>
        <ProjectSelect
          allowNone
          noneLabel={t("list.allProjects")}
          aria-label={t("fields.project")}
          value={filters.projectId ?? ""}
          onChange={(e) => update({ projectId: e.target.value || undefined })}
          className={compactSelect}
        />
        <select
          aria-label={t("fields.status")}
          value={filters.status ?? ""}
          onChange={(e) => update({ status: (e.target.value || undefined) as ExpenseStatus | undefined })}
          className={compactSelect}
        >
          <option value="">{t("list.allStatuses")}</option>
          {EXPENSE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`status.${s}`)}
            </option>
          ))}
        </select>
        <select
          aria-label={t("fields.category")}
          value={filters.category ?? ""}
          onChange={(e) => update({ category: (e.target.value || undefined) as ExpenseCategory | undefined })}
          className={compactSelect}
        >
          <option value="">{t("list.allCategories")}</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {tCategories(c)}
            </option>
          ))}
        </select>
      </fieldset>

      <div className={isFetching && !isLoading ? "opacity-70 transition-opacity" : ""}>
        <DataTable<ExpenseRecord>
          rows={data?.data ?? []}
          isLoading={isLoading}
          rowKey={(e) => e.id}
          emptyMessage={t("list.empty")}
          rowActions={
            isAdmin && data?.data.some((e) => e.status === "PENDING")
              ? (e) =>
                  e.status === "PENDING" ? (
                    <ReviewExpenseActions expenseId={e.id} label={`${e.project.name} · ${formatCOP(e.amount)}`} />
                  ) : null
              : undefined
          }
          columns={[
            {
              id: "description",
              header: t("fields.description"),
              primary: true,
              accessor: (e) => (
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{e.description || tCategories(e.category)}</p>
                  <p className="truncate text-xs text-ink-muted">
                    {e.project.name}
                    {e.supplier && ` · ${e.supplier.name}`}
                  </p>
                  <p className="truncate text-xs text-ink-muted">
                    {t("fields.registeredBy")}: {payer(e)}
                  </p>
                  {e.status === "REJECTED" && e.rejectionReason && (
                    <p className="mt-0.5 whitespace-normal text-xs text-critical">
                      {t("fields.rejectionReason")}: {e.rejectionReason}
                    </p>
                  )}
                </div>
              ),
            },
            { id: "category", header: t("fields.category"), accessor: (e) => tCategories(e.category) },
            {
              id: "date",
              header: t("fields.date"),
              accessor: (e) => (
                <span className="whitespace-nowrap">{format.dateTime(new Date(e.date), { dateStyle: "medium" })}</span>
              ),
            },
            { id: "status", header: t("fields.status"), accessor: (e) => <ExpenseStatusBadge status={e.status} /> },
            {
              id: "support",
              header: tCashflow("fields.support"),
              accessor: (e) =>
                e.supportUrl ? (
                  <a
                    href={e.supportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-accent hover:underline"
                  >
                    <FileText size={14} aria-hidden /> {tFinance("queue.viewSupport")}
                  </a>
                ) : (
                  <span className="text-ink-muted">{tFinance("queue.noSupport")}</span>
                ),
            },
            {
              id: "amount",
              header: t("fields.amount"),
              align: "right",
              accessor: (e) => <span className="font-mono-data font-medium">{formatCOP(e.amount)}</span>,
            },
          ]}
        />
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 text-sm text-ink-muted">
          <button
            type="button"
            className={secondaryButtonClass}
            disabled={pagination.page <= 1}
            onClick={() => update({ page: pagination.page - 1 })}
          >
            {t("list.prev")}
          </button>
          <span>{t("list.page", { page: pagination.page, total: pagination.totalPages })}</span>
          <button
            type="button"
            className={secondaryButtonClass}
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => update({ page: pagination.page + 1 })}
          >
            {t("list.next")}
          </button>
        </div>
      )}
    </section>
  );
}
