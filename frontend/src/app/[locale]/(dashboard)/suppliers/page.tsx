"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Download, Pencil, Plus, Search, Trash2, TrendingUp } from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { Reveal, RevealItem } from "@/components/ui/reveal";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/form";
import { CostsTabs } from "@/components/finance/costs-tabs";
import { SupplierFormModal } from "@/components/finance/supplier-form-modal";
import { useRemoveSupplier, useSupplierStats, useSuppliers } from "@/lib/finance-service";
import { useFormatCOP } from "@/lib/format";
import { exportCsv } from "@/lib/export-csv";
import { useApiErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "@/store/toast.store";
import { Supplier, SupplierStatsRow } from "@/types/finance";

const SEARCH_DEBOUNCE_MS = 250;

export default function SuppliersPage() {
  const t = useTranslations("suppliers");
  const tCategories = useTranslations("expenses.categories");
  const tCsv = useTranslations("csv");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const formatCOP = useFormatCOP();
  const errorMessage = useApiErrorMessage();
  const isAdmin = useAuthStore((s) => s.user?.role === "ADMIN");

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState<Supplier | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useSuppliers({ search: debounced || undefined, limit: 100 });
  const { data: stats, isLoading: statsLoading } = useSupplierStats(isAdmin);
  const removeSupplier = useRemoveSupplier();

  // Map for O(1) stats lookup per directory row
  const statsById = useMemo(
    () => new Map<string, SupplierStatsRow>((stats?.suppliers ?? []).map((s) => [s.supplierId, s])),
    [stats]
  );
  const suppliers = data?.data ?? [];

  const date = (iso: string | null | undefined) =>
    iso ? format.dateTime(new Date(iso), { dateStyle: "medium" }) : tCommon("noData");

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function confirmDelete() {
    if (!deleting) return;
    removeSupplier.mutate(deleting.id, {
      onSuccess: () => {
        toast.success(t("deleted"));
        setDeleting(null);
      },
      onError: (error) => toast.error(errorMessage(error, { 409: t("deleteBlocked") })),
    });
  }

  function handleExport() {
    exportCsv(
      `obraiq-${tCsv("suppliers")}-${new Date().toISOString().slice(0, 10)}`,
      [
        t("fields.name"),
        t("fields.nit"),
        t("fields.category"),
        t("fields.phone"),
        t("fields.email"),
        t("fields.totalPurchased"),
        t("fields.transactions"),
        t("fields.lastPurchase"),
      ],
      suppliers.map((s) => {
        const st = statsById.get(s.id);
        return [
          s.name,
          s.nit,
          s.category ? tCategories(s.category) : "",
          s.phone,
          s.email,
          st?.totalPurchased ?? 0,
          st?.transactions ?? 0,
          st?.lastPurchase?.slice(0, 10) ?? "",
        ];
      })
    );
  }

  return (
    <>
      <DashboardHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <>
            {isAdmin && (
              <button type="button" onClick={handleExport} disabled={suppliers.length === 0} className={secondaryButtonClass}>
                <Download size={15} aria-hidden /> {t("export")}
              </button>
            )}
            <button type="button" onClick={openCreate} className={primaryButtonClass}>
              <Plus size={15} aria-hidden /> {t("new")}
            </button>
          </>
        }
      />

      <main className="space-y-5 p-4 sm:p-6">
        <CostsTabs />

        <Reveal className="space-y-5">
          {isAdmin && (
            <RevealItem>
              <h2 className="mb-3 text-sm font-semibold text-ink">{t("topTitle")}</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {statsLoading &&
                  [0, 1, 2].map((i) => (
                    <div key={i} className="h-36 animate-pulse rounded-xl bg-surface motion-reduce:animate-none" />
                  ))}
                {!statsLoading && stats?.top.length === 0 && (
                  <p className="text-sm text-ink-muted md:col-span-3">{t("empty")}</p>
                )}
                {stats?.top.map((s, index) => (
                  <article
                    key={s.supplierId}
                    className={`rounded-xl border bg-surface p-5 ${index === 0 ? "border-accent/50" : "border-line"}`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent" aria-hidden>
                        <TrendingUp size={17} />
                      </span>
                      <span className="rounded-md border border-line bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-ink-muted">
                        {t("topBadge", { rank: index + 1 })}
                      </span>
                    </div>
                    <p className="text-[11px] uppercase tracking-wide text-ink-muted">
                      {s.category ? tCategories(s.category) : t("noCategory")}
                    </p>
                    <p className="truncate text-lg font-semibold text-ink">{s.name}</p>
                    <p className="font-mono-data text-xl font-semibold text-accent">{formatCOP(s.totalPurchased)}</p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {t("transactions", { count: s.transactions })} · {t("lastPurchase", { date: date(s.lastPurchase) })}
                    </p>
                  </article>
                ))}
              </div>
            </RevealItem>
          )}

          <RevealItem className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-ink">
                {t("directory")}{" "}
                {data && <span className="text-sm font-normal text-ink-muted">· {t("count", { count: data.pagination.total })}</span>}
              </h2>
              <div className="relative w-full sm:w-72">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("search")}
                  aria-label={t("search")}
                  className={`${fieldClass} bg-surface pl-9`}
                />
              </div>
            </div>

            <DataTable<Supplier>
              rows={suppliers}
              isLoading={isLoading}
              rowKey={(s) => s.id}
              emptyMessage={debounced ? t("emptySearch") : t("empty")}
              emptyAction={
                !debounced && (
                  <button type="button" onClick={openCreate} className={primaryButtonClass}>
                    <Plus size={15} aria-hidden /> {t("new")}
                  </button>
                )
              }
              rowActions={
                isAdmin
                  ? (s) => (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(s);
                            setFormOpen(true);
                          }}
                          aria-label={`${t("edit")}: ${s.name}`}
                          className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border border-line text-ink-muted hover:bg-surface-2 hover:text-ink"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(s)}
                          aria-label={`${t("delete")}: ${s.name}`}
                          className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border border-line text-ink-muted hover:border-critical/40 hover:text-critical"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )
                  : undefined
              }
              columns={[
                {
                  id: "name",
                  header: t("fields.name"),
                  primary: true,
                  accessor: (s) => (
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-xs font-semibold text-ink-muted"
                        aria-hidden
                      >
                        {s.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{s.name}</p>
                        {s.nit && <p className="font-mono-data text-xs text-ink-muted">{s.nit}</p>}
                      </div>
                    </div>
                  ),
                },
                {
                  id: "category",
                  header: t("fields.category"),
                  accessor: (s) =>
                    s.category ? (
                      <span className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-xs">{tCategories(s.category)}</span>
                    ) : (
                      <span className="text-ink-muted">{t("noCategory")}</span>
                    ),
                },
                ...(isAdmin
                  ? [
                      {
                        id: "total",
                        header: t("fields.totalPurchased"),
                        align: "right" as const,
                        accessor: (s: Supplier) => (
                          <span className="font-mono-data font-medium">{formatCOP(statsById.get(s.id)?.totalPurchased ?? 0)}</span>
                        ),
                      },
                      {
                        id: "transactions",
                        header: t("fields.transactions"),
                        align: "right" as const,
                        accessor: (s: Supplier) => statsById.get(s.id)?.transactions ?? 0,
                      },
                      {
                        id: "last",
                        header: t("fields.lastPurchase"),
                        accessor: (s: Supplier) => (
                          <span className="whitespace-nowrap">{date(statsById.get(s.id)?.lastPurchase)}</span>
                        ),
                      },
                    ]
                  : [
                      { id: "phone", header: t("fields.phone"), accessor: (s: Supplier) => s.phone ?? tCommon("noData") },
                    ]),
              ]}
            />
          </RevealItem>
        </Reveal>
      </main>

      <SupplierFormModal open={formOpen} onClose={() => setFormOpen(false)} supplier={editing} fullForm={isAdmin} />

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title={t("deleteTitle")}>
        <p className="mb-4 text-sm text-ink">{deleting && t("deleteConfirm", { name: deleting.name })}</p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setDeleting(null)} className={secondaryButtonClass}>
            {tCommon("cancel")}
          </button>
          <button
            type="button"
            onClick={confirmDelete}
            disabled={removeSupplier.isPending}
            className={`${primaryButtonClass} bg-critical hover:bg-critical/90`}
          >
            {t("delete")}
          </button>
        </div>
      </Modal>
    </>
  );
}
