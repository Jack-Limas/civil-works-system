"use client";

import { useFormatter, useTranslations } from "next-intl";
import {
  AlertOctagon,
  CalendarClock,
  Clock,
  FileText,
  Gauge,
  Landmark,
  PiggyBank,
  Plus,
  Receipt,
  Store,
} from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Reveal, RevealItem } from "@/components/ui/reveal";
import { primaryButtonClass } from "@/components/ui/form";
import { CostsTabs } from "@/components/finance/costs-tabs";
import { ProgressComparisonChart } from "@/components/finance/progress-comparison-chart";
import { ExpensesTable } from "@/components/finance/expenses-table";
import { ExpenseStatusBadge } from "@/components/finance/expense-status-badge";
import { ReviewExpenseActions } from "@/components/finance/review-expense-actions";
import { AlertMessage } from "@/components/alerts/alert-message";
import { Link } from "@/i18n/navigation";
import { useFinanceSummary } from "@/lib/finance-service";
import { useExpensesList } from "@/lib/expenses-service";
import { useFormatCOP } from "@/lib/format";
import { useAuthStore } from "@/store/auth.store";
import { ExpenseRecord } from "@/types/finance";

const percent = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 1000) / 10 : 0);

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="h-full rounded-xl border border-line bg-surface p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function FinanceSummaryPage() {
  const t = useTranslations("finance");
  const tCategories = useTranslations("expenses.categories");
  const tErrors = useTranslations("errors");
  const format = useFormatter();
  const formatCOP = useFormatCOP();
  const isAdmin = useAuthStore((s) => s.user?.role === "ADMIN");

  const { data: summary, isLoading, isError, refetch } = useFinanceSummary();
  const { data: pendingList } = useExpensesList({ status: "PENDING", limit: 5 }, isAdmin);

  const highAlerts = summary?.financialAlerts.filter((a) => a.severity === "HIGH") ?? [];
  const pendingCount = summary?.pendingApproval.count ?? 0;
  const payer = (e: ExpenseRecord) =>
    !e.registeredBy || e.registeredBy.role === "ADMIN" ? t("recent.companyPayment") : e.registeredBy.name;

  const registerButton = (
    <Link href="/expenses/new" className={primaryButtonClass}>
      <Plus size={15} aria-hidden /> {t("tabs.register")}
    </Link>
  );

  return (
    <>
      <DashboardHeader title={t("title")} subtitle={t("subtitle")} actions={registerButton} />

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

        {!isLoading && summary && summary.projects.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line bg-surface px-6 py-14 text-center">
            <Receipt size={32} className="text-ink-muted" aria-hidden />
            <h2 className="text-base font-semibold text-ink">{t("empty.title")}</h2>
            <p className="max-w-sm text-sm text-ink-muted">{t("empty.description")}</p>
          </div>
        ) : (
          <Reveal className="space-y-5">
            {highAlerts.length > 0 && (
              <RevealItem>
                <div
                  role="alert"
                  className="flex flex-col gap-3 rounded-xl border border-critical/40 bg-critical/10 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex gap-3">
                    <AlertOctagon size={22} className="mt-0.5 shrink-0 text-critical" aria-hidden />
                    <div>
                      <p className="font-semibold text-critical">{t("riskBanner.title")}</p>
                      <p className="text-sm text-ink">
                        <span className="font-medium">{highAlerts[0].project.name}</span> ·{" "}
                        <AlertMessage alert={highAlerts[0]} />
                      </p>
                      {highAlerts.length > 1 && (
                        <p className="mt-1 text-xs text-ink-muted">{t("riskBanner.more", { count: highAlerts.length - 1 })}</p>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/projects/${highAlerts[0].project.id}`}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-critical px-4 text-sm font-medium text-white hover:bg-critical/90 sm:min-h-10"
                  >
                    {t("riskBanner.action")}
                  </Link>
                </div>
              </RevealItem>
            )}

            {pendingCount > 0 && (
              <RevealItem>
                <div className="rounded-xl border border-warning/40 bg-warning/10 p-4">
                  <div className="flex gap-3">
                    <Clock size={20} className="mt-0.5 shrink-0 text-warning" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{t("pendingNotice.title", { count: pendingCount })}</p>
                      <p className="text-sm text-ink-muted">
                        {isAdmin ? t("pendingNotice.description") : t("pendingNotice.residentDescription")}
                      </p>
                    </div>
                  </div>
                  {isAdmin && pendingList && pendingList.data.length > 0 && (
                    <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-surface">
                      {pendingList.data.map((e) => (
                        <li key={e.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-ink">
                              {e.description || tCategories(e.category)} ·{" "}
                              <span className="font-mono-data">{formatCOP(e.amount)}</span>
                            </p>
                            <p className="truncate text-xs text-ink-muted">
                              {e.project.name} · {payer(e)} · {format.dateTime(new Date(e.date), { dateStyle: "medium" })}
                              {e.supportUrl && (
                                <>
                                  {" · "}
                                  <a href={e.supportUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                                    {t("queue.viewSupport")}
                                  </a>
                                </>
                              )}
                            </p>
                          </div>
                          <ReviewExpenseActions expenseId={e.id} label={`${e.project.name} · ${formatCOP(e.amount)}`} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </RevealItem>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <RevealItem>
                <KpiCard
                  label={t("kpis.totalBudget")}
                  value={formatCOP(summary?.totalBudget, { compact: true })}
                  hint={t("kpis.totalBudgetHint", { count: summary?.projects.length ?? 0 })}
                  icon={Landmark}
                  loading={isLoading}
                />
              </RevealItem>
              <RevealItem>
                <KpiCard
                  label={t("kpis.spent")}
                  value={formatCOP(summary?.approvedSpent, { compact: true })}
                  hint={t("kpis.spentHint", { percent: percent(summary?.approvedSpent ?? 0, summary?.totalBudget ?? 0) })}
                  icon={Receipt}
                  tone="accent"
                  emphasize
                  loading={isLoading}
                />
              </RevealItem>
              <RevealItem>
                <KpiCard
                  label={t("kpis.available")}
                  value={formatCOP(summary?.available, { compact: true })}
                  hint={t("kpis.availableHint", { percent: percent(summary?.available ?? 0, summary?.totalBudget ?? 0) })}
                  icon={PiggyBank}
                  tone={(summary?.available ?? 0) < 0 ? "critical" : "success"}
                  emphasize
                  loading={isLoading}
                />
              </RevealItem>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <RevealItem className="lg:col-span-2">
                <Card title={t("chart.title")}>
                  <p className="-mt-3 mb-3 text-xs text-ink-muted">{t("chart.subtitle")}</p>
                  {isLoading ? (
                    <div className="h-56 animate-pulse rounded-lg bg-surface-2 motion-reduce:animate-none" aria-busy="true" />
                  ) : (
                    <ProgressComparisonChart projects={summary?.projects ?? []} />
                  )}
                </Card>
              </RevealItem>
              <RevealItem>
                <Card
                  title={t("recent.title")}
                  action={
                    <a href="#expenses-list" className="text-xs text-accent hover:underline">
                      {t("recent.seeAll")}
                    </a>
                  }
                >
                  {isLoading && (
                    <div className="space-y-3" aria-busy="true">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-2 motion-reduce:animate-none" />
                      ))}
                    </div>
                  )}
                  {!isLoading && summary?.recentExpenses.length === 0 && (
                    <p className="text-sm text-ink-muted">{t("recent.empty")}</p>
                  )}
                  <ul className="divide-y divide-line">
                    {summary?.recentExpenses.map((e) => (
                      <li key={e.id} className="flex items-start justify-between gap-3 py-3 first:pt-0">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink">{e.description || tCategories(e.category)}</p>
                          <p className="truncate text-[11px] uppercase tracking-wide text-ink-muted">{e.project.name}</p>
                          <p className="truncate text-xs text-ink-muted">
                            {format.dateTime(new Date(e.date), { day: "numeric", month: "short" })} · {payer(e)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="font-mono-data text-sm font-semibold text-ink">{formatCOP(e.amount)}</span>
                          <ExpenseStatusBadge status={e.status} />
                          {e.supportUrl && (
                            <a
                              href={e.supportUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={t("queue.viewSupport")}
                              className="text-ink-muted hover:text-accent"
                            >
                              <FileText size={14} />
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
              </RevealItem>
            </div>

            <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
              <RevealItem>
                <KpiCard
                  label={t("kpis.activeSuppliers")}
                  value={summary?.activeSuppliers ?? 0}
                  hint={t("kpis.activeSuppliersHint")}
                  icon={Store}
                  loading={isLoading}
                />
              </RevealItem>
              <RevealItem>
                <KpiCard
                  label={t("kpis.pending")}
                  value={pendingCount}
                  hint={t("kpis.pendingHint", { amount: formatCOP(summary?.pendingApproval.amount) })}
                  icon={Clock}
                  tone="warning"
                  emphasize={pendingCount > 0}
                  loading={isLoading}
                />
              </RevealItem>
              <RevealItem>
                <KpiCard
                  label={t("kpis.cpi")}
                  labelAddon={<InfoTooltip text={t("kpis.cpiTooltip")} label={t("kpis.cpi")} />}
                  value={summary?.cpi == null ? "—" : format.number(summary.cpi, { maximumFractionDigits: 2 })}
                  hint={t("kpis.cpiHint", { value: summary?.cpi == null ? "none" : "some" })}
                  icon={Gauge}
                  tone={summary?.cpi == null ? "neutral" : summary.cpi >= 1 ? "success" : "critical"}
                  emphasize={summary?.cpi != null}
                  loading={isLoading}
                />
              </RevealItem>
              <RevealItem>
                <KpiCard
                  label={t("kpis.milestone")}
                  value={summary?.nextMilestone ? summary.nextMilestone.days : "—"}
                  hint={
                    summary?.nextMilestone
                      ? t("kpis.milestoneHint", { project: summary.nextMilestone.name })
                      : t("kpis.noMilestone")
                  }
                  icon={CalendarClock}
                  tone="ai"
                  loading={isLoading}
                />
              </RevealItem>
            </div>

            <RevealItem>
              <div id="expenses-list" className="scroll-mt-4">
                <ExpensesTable />
              </div>
            </RevealItem>
          </Reveal>
        )}
      </main>
    </>
  );
}
