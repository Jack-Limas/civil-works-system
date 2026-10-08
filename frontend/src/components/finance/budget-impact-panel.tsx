"use client";

import { useFormatter, useTranslations } from "next-intl";
import { AlertTriangle, Info, Wallet } from "lucide-react";
import { useBudgetIndicators } from "@/lib/expenses-service";
import { useCashBalances } from "@/lib/finance-service";
import { useFormatCOP } from "@/lib/format";

/**
 * Live side panel of the expense form: project budget status and what share
 * of the available budget the amount being typed represents. Residents also
 * see their petty-cash balance before and after the expense.
 */
export function BudgetImpactPanel({
  projectId,
  amount,
  isResident,
  residentId,
}: {
  projectId: string;
  amount: number;
  isResident: boolean;
  residentId?: string;
}) {
  const t = useTranslations("expenseForm");
  const format = useFormatter();
  const formatCOP = useFormatCOP();
  const { data: indicators, isLoading } = useBudgetIndicators(projectId);
  const { data: cash } = useCashBalances();
  const myCash = isResident ? cash?.residents.find((r) => r.residentId === residentId) : undefined;

  const available = indicators?.availableBudget ?? 0;
  const executedPercent = Math.min(100, Math.max(0, indicators?.executedPercentage ?? 0));
  const impact = available > 0 ? (amount / available) * 100 : null;
  const pct = (n: number) => format.number(n, { maximumFractionDigits: 1 });

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-line bg-surface p-5" aria-live="polite">
        <h2 className="mb-3 text-sm font-semibold text-ink">{t("budget.title")}</h2>
        {!projectId && <p className="text-sm text-ink-muted">{t("budget.selectProject")}</p>}
        {projectId && isLoading && (
          <div className="space-y-2" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-surface-2 motion-reduce:animate-none" />
            ))}
          </div>
        )}
        {projectId && indicators && (
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex justify-between text-xs text-ink-muted">
                <span>{t("budget.executedPercent", { percent: pct(indicators.executedPercentage) })}</span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-surface-2"
                role="progressbar"
                aria-valuenow={executedPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t("budget.executed")}
              >
                <div className="h-full rounded-full bg-accent" style={{ width: `${executedPercent}%` }} />
              </div>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="rounded-lg bg-surface-2 p-3">
                <dt className="text-xs text-ink-muted">{t("budget.assigned")}</dt>
                <dd className="font-mono-data text-lg font-semibold text-ink">{formatCOP(indicators.budget)}</dd>
              </div>
              <div className="rounded-lg bg-surface-2 p-3">
                <dt className="text-xs text-ink-muted">{t("budget.executed")}</dt>
                <dd className="font-mono-data text-lg font-semibold text-ink">{formatCOP(indicators.executedExpenses)}</dd>
              </div>
              <div className={`rounded-lg p-3 ${available > 0 ? "bg-success/10" : "bg-critical/10"}`}>
                <dt className="text-xs text-ink-muted">{t("budget.available")}</dt>
                <dd className={`font-mono-data text-lg font-semibold ${available > 0 ? "text-success" : "text-critical"}`}>
                  {formatCOP(available)}
                </dd>
              </div>
            </dl>

            {amount > 0 && (
              <div
                className={`flex gap-2 rounded-lg border p-3 text-xs ${
                  impact === null || impact > 100 ? "border-critical/40 bg-critical/10" : "border-warning/40 bg-warning/10"
                }`}
              >
                {impact === null || impact > 100 ? (
                  <AlertTriangle size={16} className="shrink-0 text-critical" aria-hidden />
                ) : (
                  <Info size={16} className="shrink-0 text-warning" aria-hidden />
                )}
                <div>
                  <p className="font-semibold text-ink">{t("budget.impactTitle")}</p>
                  <p className="text-ink">
                    {impact === null
                      ? t("budget.impactNoBudget")
                      : impact > 100
                        ? t("budget.impactOver")
                        : t("budget.impact", { percent: pct(impact) })}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {isResident && myCash && (
        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <Wallet size={15} className="text-accent" aria-hidden /> {t("cash.title")}
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">{t("cash.balance")}</dt>
              <dd className={`font-mono-data font-semibold ${myCash.balance < 0 ? "text-critical" : "text-ink"}`}>
                {formatCOP(myCash.balance)}
              </dd>
            </div>
            {amount > 0 && (
              <div className="flex justify-between gap-3 border-t border-line pt-2">
                <dt className="text-ink-muted">{t("cash.after")}</dt>
                <dd className={`font-mono-data font-semibold ${myCash.balance - amount < 0 ? "text-critical" : "text-success"}`}>
                  {formatCOP(myCash.balance - amount)}
                </dd>
              </div>
            )}
          </dl>
          {amount > 0 && myCash.balance - amount < 0 && <p className="mt-2 text-xs text-critical">{t("cash.negative")}</p>}
        </section>
      )}
    </div>
  );
}
