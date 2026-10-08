"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ArrowDownLeft, ArrowUpRight, Download, FileText } from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DataTable } from "@/components/ui/data-table";
import { Reveal, RevealItem } from "@/components/ui/reveal";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { fieldClass, secondaryButtonClass } from "@/components/ui/form";
import { ProjectSelect } from "@/components/projects/project-select";
import { CostsTabs } from "@/components/finance/costs-tabs";
import { CashflowChart } from "@/components/finance/cashflow-chart";
import { useCashflow, useSuppliers, CashflowParams } from "@/lib/finance-service";
import { apiClient } from "@/lib/api-client";
import { exportCsv } from "@/lib/export-csv";
import { useFormatCOP } from "@/lib/format";
import { useApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/store/toast.store";
import { Cashflow, LedgerEntry } from "@/types/finance";

const RANGES = [3, 6, 12] as const;
const PAGE_SIZE = 15;
const EXPORT_PAGE_SIZE = 100;
const EXPORT_MAX_PAGES = 20;

export default function CashflowPage() {
  const t = useTranslations("cashflow");
  const tCategories = useTranslations("expenses.categories");
  const tList = useTranslations("expense.list");
  const tCsv = useTranslations("csv");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const format = useFormatter();
  const formatCOP = useFormatCOP();
  const errorMessage = useApiErrorMessage();

  const [params, setParams] = useState<CashflowParams>({ months: 6, page: 1, limit: PAGE_SIZE });
  const [exporting, setExporting] = useState(false);
  const { data, isLoading, isFetching, isError, refetch } = useCashflow(params);
  const { data: suppliers } = useSuppliers({ limit: 100 });

  const update = (patch: Partial<CashflowParams>) => setParams((p) => ({ ...p, ...patch, page: patch.page ?? 1 }));

  const describe = (e: LedgerEntry) =>
    e.kind === "TRANSFER"
      ? e.description || t("transferTo", { name: e.person?.name ?? "" })
      : e.description || (e.category ? tCategories(e.category) : t("noDescription"));

  async function handleExport() {
    setExporting(true);
    try {
      const rows: LedgerEntry[] = [];
      for (let page = 1; page <= EXPORT_MAX_PAGES; page++) {
        const { data: res } = await apiClient.get<{ data: Cashflow }>("/finance/cashflow", {
          params: { ...params, page, limit: EXPORT_PAGE_SIZE },
        });
        rows.push(...res.data.ledger.data);
        if (page >= res.data.ledger.pagination.totalPages) break;
      }
      exportCsv(
        `obraiq-${tCsv("cashflow")}-${new Date().toISOString().slice(0, 10)}`,
        [
          t("fields.date"),
          t("fields.type"),
          t("fields.description"),
          t("fields.project"),
          t("fields.category"),
          t("fields.person"),
          t("fields.amount"),
          t("fields.support"),
        ],
        rows.map((e) => [
          e.date.slice(0, 10),
          t(`kind.${e.kind}`),
          describe(e),
          e.project?.name,
          e.category ? tCategories(e.category) : "",
          e.person?.name,
          e.kind === "EXPENSE" ? -e.amount : e.amount,
          e.supportUrl,
        ])
      );
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setExporting(false);
    }
  }

  const pagination = data?.ledger.pagination;

  return (
    <>
      <DashboardHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <button type="button" onClick={handleExport} disabled={exporting || !data?.ledger.data.length} className={secondaryButtonClass}>
            <Download size={15} aria-hidden /> {exporting ? tCommon("loading") : t("export")}
          </button>
        }
      />

      <main className="space-y-5 p-4 sm:p-6">
        <CostsTabs />

        {isError && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-critical/30 bg-critical/10 p-3 text-sm text-ink">
            {tErrors("loadFailed")}
            <button type="button" onClick={() => refetch()} className="font-medium text-accent hover:underline">
              {tErrors("retry")}
            </button>
          </div>
        )}

        <Reveal className="space-y-5">
          <RevealItem className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div role="group" aria-label={t("range.label")} className="inline-flex w-full rounded-lg border border-line bg-surface p-1 sm:w-auto">
              {RANGES.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={params.months === m}
                  onClick={() => update({ months: m })}
                  className={`min-h-9 flex-1 rounded-md px-4 text-sm transition-colors sm:flex-none ${
                    params.months === m ? "bg-accent font-medium text-white" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {t(`range.${m}`)}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:w-[32rem]">
              <ProjectSelect
                allowNone
                noneLabel={t("allProjects")}
                aria-label={t("fields.project")}
                value={params.projectId ?? ""}
                onChange={(e) => update({ projectId: e.target.value || undefined })}
                className={`${fieldClass} bg-surface`}
              />
              <select
                aria-label={t("allSuppliers")}
                value={params.supplierId ?? ""}
                onChange={(e) => update({ supplierId: e.target.value || undefined })}
                className={`${fieldClass} bg-surface`}
              >
                <option value="">{t("allSuppliers")}</option>
                {suppliers?.data.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </RevealItem>

          <RevealItem>
            <section className="rounded-xl border border-line bg-surface p-5">
              <h2 className="mb-3 text-base font-semibold text-ink">{t("chartTitle")}</h2>
              {isLoading ? (
                <div className="h-72 animate-pulse rounded-lg bg-surface-2 motion-reduce:animate-none" aria-busy="true" />
              ) : (
                <CashflowChart series={data?.series ?? []} />
              )}
            </section>
          </RevealItem>

          <RevealItem className="space-y-3">
            <h2 className="text-base font-semibold text-ink">{t("ledgerTitle")}</h2>
            <div className={isFetching && !isLoading ? "opacity-70 transition-opacity" : ""}>
              <DataTable<LedgerEntry>
                rows={data?.ledger.data ?? []}
                isLoading={isLoading}
                rowKey={(e) => `${e.kind}-${e.id}`}
                emptyMessage={t("empty")}
                columns={[
                  {
                    id: "description",
                    header: t("fields.description"),
                    primary: true,
                    accessor: (e) => (
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            e.kind === "TRANSFER" ? "bg-ai/15 text-ai" : "bg-accent/15 text-accent"
                          }`}
                          aria-hidden
                        >
                          {e.kind === "TRANSFER" ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">{describe(e)}</p>
                          {e.supplier && <p className="truncate text-xs text-ink-muted">{e.supplier.name}</p>}
                        </div>
                      </div>
                    ),
                  },
                  {
                    id: "date",
                    header: t("fields.date"),
                    accessor: (e) => (
                      <span className="whitespace-nowrap">{format.dateTime(new Date(e.date), { dateStyle: "medium" })}</span>
                    ),
                  },
                  {
                    id: "project",
                    header: t("fields.project"),
                    accessor: (e) => <span className="line-clamp-2">{e.project?.name ?? tCommon("noData")}</span>,
                  },
                  {
                    id: "category",
                    header: t("fields.category"),
                    accessor: (e) =>
                      e.category ? (
                        <span className="whitespace-nowrap rounded-full border border-line bg-surface-2 px-2 py-0.5 text-xs">{tCategories(e.category)}</span>
                      ) : (
                        tCommon("noData")
                      ),
                  },
                  {
                    id: "type",
                    header: t("fields.type"),
                    accessor: (e) => (
                      <span className={`whitespace-nowrap text-xs font-medium ${e.kind === "TRANSFER" ? "text-ai" : "text-accent"}`}>
                        ● {t(`kind.${e.kind}`)}
                      </span>
                    ),
                  },
                  {
                    id: "amount",
                    header: t("fields.amount"),
                    align: "right",
                    accessor: (e) => (
                      <span className={`whitespace-nowrap font-mono-data font-semibold ${e.kind === "TRANSFER" ? "text-success" : "text-critical"}`}>
                        {e.kind === "TRANSFER" ? "+" : "−"}
                        {formatCOP(e.amount)}
                      </span>
                    ),
                  },
                  {
                    id: "support",
                    header: t("fields.support"),
                    accessor: (e) =>
                      e.supportUrl ? (
                        <a
                          href={e.supportUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={t("viewSupport")}
                          className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-accent hover:bg-surface-2"
                        >
                          <FileText size={16} />
                        </a>
                      ) : (
                        tCommon("noData")
                      ),
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
          </RevealItem>

          <RevealItem>
            {/* Dark summary strip on purpose: --sidebar is dark in both themes */}
            <section className="grid grid-cols-1 gap-4 rounded-xl bg-sidebar p-5 text-white sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-sidebar-ink">{t("totals.transfers")}</p>
                <p className="font-mono-data text-xl font-semibold">{formatCOP(data?.totals.transfers)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-sidebar-ink">{t("totals.expenses")}</p>
                <p className="font-mono-data text-xl font-semibold text-accent">{formatCOP(data?.totals.approvedExpenses)}</p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-sidebar-ink">
                  {t("totals.toBeAccounted")}
                  <InfoTooltip text={t("totals.toBeAccountedHint")} label={t("totals.toBeAccounted")} />
                </p>
                <p className={`font-mono-data text-xl font-semibold ${(data?.totals.toBeAccounted ?? 0) < 0 ? "text-critical" : ""}`}>
                  {formatCOP(data?.totals.toBeAccounted)}
                </p>
              </div>
            </section>
          </RevealItem>
        </Reveal>
      </main>
    </>
  );
}
