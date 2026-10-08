"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { HandCoins, Landmark } from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DataTable } from "@/components/ui/data-table";
import { Reveal, RevealItem } from "@/components/ui/reveal";
import { primaryButtonClass } from "@/components/ui/form";
import { CostsTabs } from "@/components/finance/costs-tabs";
import { FundTransferModal } from "@/components/finance/fund-transfer-modal";
import { useCashBalances, useFundTransfers } from "@/lib/finance-service";
import { useFormatCOP } from "@/lib/format";
import { nameInitial } from "@/lib/initials";
import { useAuthStore } from "@/store/auth.store";
import { FundTransfer, ResidentBalance } from "@/types/finance";

function UsageBar({ percent }: { percent: number | null }) {
  const value = Math.min(100, Math.max(0, percent ?? 0));
  const tone = (percent ?? 0) > 100 ? "bg-critical" : (percent ?? 0) >= 80 ? "bg-warning" : "bg-success";
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2"
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${value}%` }} />
    </div>
  );
}

export default function CashPage() {
  const t = useTranslations("cash");
  const tMethods = useTranslations("expense.paymentMethods");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const formatCOP = useFormatCOP();
  const isAdmin = useAuthStore((s) => s.user?.role === "ADMIN");

  const [transferOpen, setTransferOpen] = useState(false);
  const [presetResident, setPresetResident] = useState<string | undefined>(undefined);
  const { data: balances, isLoading } = useCashBalances();
  const { data: transfers, isLoading: transfersLoading } = useFundTransfers({ limit: 50 });

  const totals = balances?.totals;
  const residents = balances?.residents ?? [];

  function assignTo(residentId?: string) {
    setPresetResident(residentId);
    setTransferOpen(true);
  }

  const balanceRow = (r: ResidentBalance) => (
    <li key={r.residentId} className="space-y-2 py-4 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent"
          aria-hidden
        >
          {nameInitial(r.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink" title={r.name}>
            {r.name}
          </p>
          <p className={`font-mono-data text-lg font-semibold ${r.balance < 0 ? "text-critical" : "text-ink"}`}>
            {formatCOP(r.balance)}
          </p>
        </div>
        <span className={`shrink-0 text-xs ${r.balance < 0 ? "font-medium text-critical" : "text-ink-muted"}`}>
          {r.balance < 0 ? t("negative") : r.usedPercentage !== null ? t("used", { percent: format.number(r.usedPercentage) }) : ""}
        </span>
      </div>
      <UsageBar percent={r.usedPercentage} />
      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
        {r.transfersCount === 0 ? (
          <div>
            <dt className="sr-only">{t("received")}</dt>
            <dd>{t("noTransfers")}</dd>
          </div>
        ) : (
          <>
            <div className="flex gap-1">
              <dt>{t("received")}</dt>
              <dd className="font-mono-data text-ink">{formatCOP(r.transfersReceived)}</dd>
            </div>
            <div className="flex gap-1">
              <dt>{t("spent")}</dt>
              <dd className="font-mono-data text-ink">{formatCOP(r.approvedExpenses + r.pendingExpenses)}</dd>
            </div>
          </>
        )}
      </dl>
      <div className="flex items-center justify-between gap-2">
        {r.pendingExpenses > 0 ? (
          <p className="text-xs text-warning">{t("pending", { amount: formatCOP(r.pendingExpenses) })}</p>
        ) : (
          <span />
        )}
        {isAdmin && (
          <button type="button" onClick={() => assignTo(r.residentId)} className="text-xs font-medium text-accent hover:underline">
            {t("assign")}
          </button>
        )}
      </div>
    </li>
  );

  return (
    <>
      <DashboardHeader
        title={t("title")}
        subtitle={isAdmin ? t("subtitle") : t("residentSubtitle")}
        actions={
          isAdmin && (
            <button type="button" onClick={() => assignTo()} className={primaryButtonClass}>
              <HandCoins size={15} aria-hidden /> {t("assign")}
            </button>
          )
        }
      />

      <main className="space-y-5 p-4 sm:p-6">
        <CostsTabs />

        <Reveal className="grid grid-cols-1 gap-5 xl:grid-cols-5">
          <RevealItem className="space-y-5 xl:col-span-2">
            {/* Dark brand card on purpose: --sidebar is dark in both themes */}
            <section className="rounded-xl bg-sidebar p-5 text-white shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-sidebar-ink">
                  {isAdmin ? t("totalBalance") : t("myBalance")}
                </p>
                <Landmark size={18} className="text-accent" aria-hidden />
              </div>
              {isLoading ? (
                <div className="h-10 w-40 animate-pulse rounded bg-white/10 motion-reduce:animate-none" aria-busy="true" />
              ) : (
                <p className={`font-mono-data text-3xl font-semibold ${(totals?.cashBalance ?? 0) < 0 ? "text-critical" : ""}`}>
                  {formatCOP(totals?.cashBalance)}
                </p>
              )}
              {totals && (
                <p className="mt-2 text-xs text-sidebar-ink">
                  {t("totalHint", { transfers: formatCOP(totals.transfersReceived), spent: formatCOP(totals.spent) })}
                </p>
              )}
              {totals && totals.toReimburse > 0 && (
                <p className="mt-1 text-xs font-medium text-accent">{t("toReimburse", { amount: formatCOP(totals.toReimburse) })}</p>
              )}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => assignTo()}
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-accent text-sm font-medium text-white hover:bg-accent/90 sm:min-h-10"
                >
                  <HandCoins size={15} aria-hidden /> {t("assign")}
                </button>
              )}
            </section>

            <section className="rounded-xl border border-line bg-surface p-5">
              <h2 className="mb-4 text-sm font-semibold text-ink">{isAdmin ? t("balancesTitle") : t("myBalance")}</h2>
              {isLoading && (
                <div className="space-y-3" aria-busy="true">
                  {[0, 1].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-2 motion-reduce:animate-none" />
                  ))}
                </div>
              )}
              {!isLoading && residents.length === 0 && <p className="text-sm text-ink-muted">{t("empty")}</p>}
              <ul className="divide-y divide-line">{residents.map(balanceRow)}</ul>
            </section>
          </RevealItem>

          <RevealItem className="space-y-3 xl:col-span-3">
            <h2 className="text-base font-semibold text-ink">{isAdmin ? t("transfersTitle") : t("myTransfersTitle")}</h2>
            <DataTable<FundTransfer>
              rows={transfers?.data ?? []}
              isLoading={transfersLoading}
              rowKey={(tr) => tr.id}
              emptyMessage={t("transfersEmpty")}
              emptyAction={
                isAdmin && (
                  <button type="button" onClick={() => assignTo()} className={primaryButtonClass}>
                    <HandCoins size={15} aria-hidden /> {t("assign")}
                  </button>
                )
              }
              columns={[
                {
                  id: "resident",
                  header: isAdmin ? t("fields.resident") : t("fields.notes"),
                  primary: true,
                  accessor: (tr) =>
                    isAdmin ? (
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{tr.resident.name}</p>
                        {tr.notes && <p className="truncate text-xs text-ink-muted">{tr.notes}</p>}
                      </div>
                    ) : (
                      // A resident only sees their own transfers: the note is more useful than their name
                      <p className="truncate font-medium text-ink">{tr.notes ?? tCommon("noData")}</p>
                    ),
                },
                {
                  id: "project",
                  header: t("fields.project"),
                  accessor: (tr) => <span className="line-clamp-2">{tr.project?.name ?? tCommon("noData")}</span>,
                },
                {
                  id: "date",
                  header: t("fields.date"),
                  accessor: (tr) => (
                    <span className="whitespace-nowrap">{format.dateTime(new Date(tr.date), { dateStyle: "medium" })}</span>
                  ),
                },
                { id: "method", header: t("fields.method"), accessor: (tr) => (tr.method ? tMethods(tr.method) : tCommon("noData")) },
                {
                  id: "amount",
                  header: t("fields.amount"),
                  align: "right",
                  accessor: (tr) => <span className="whitespace-nowrap font-mono-data font-medium text-success">{formatCOP(tr.amount)}</span>,
                },
              ]}
            />
          </RevealItem>
        </Reveal>
      </main>

      {isAdmin && (
        <FundTransferModal open={transferOpen} onClose={() => setTransferOpen(false)} defaultResidentId={presetResident} />
      )}
    </>
  );
}
