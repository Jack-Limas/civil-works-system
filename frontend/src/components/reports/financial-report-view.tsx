"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DataTable } from "@/components/ui/data-table";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Link } from "@/i18n/navigation";
import { exportCsv } from "@/lib/export-csv";
import { useFormatCOP } from "@/lib/format";
import { ChartCard, ReportKpi, TableCard, axisTick, tooltipStyle, useDayLabel } from "./report-ui";
import type { FinancialReport } from "@/types/reports";

type Row = FinancialReport["rows"][number];

/** Category slices use theme tokens so the donut works in light and dark. */
const SLICE_COLORS = ["var(--accent)", "var(--ai)", "var(--success)", "var(--warning)", "var(--critical)", "var(--ink-muted)"];

export function FinancialReportView({ report }: { report: FinancialReport }) {
  const t = useTranslations("reports.financial");
  const tReports = useTranslations("reports");
  const tFinance = useTranslations("finance.kpis");
  const tCategory = useTranslations("expenses.categories");
  const tStatus = useTranslations("projects.status");
  const tCsv = useTranslations("csv");
  const format = useFormatter();
  const formatCOP = useFormatCOP();
  const day = useDayLabel();
  const cop = (v: number) => formatCOP(v);
  const pct = (v: number) => `${format.number(v, { maximumFractionDigits: 1 })} %`;
  const cpi = (v: number | null) => (v === null ? "—" : format.number(v, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const { kpis } = report;
  const categoryTotal = report.byCategory.reduce((sum, c) => sum + c.amount, 0);

  function handleExport() {
    exportCsv(
      `obraiq-${tCsv("financial")}-${report.period.from}_${report.period.to}`,
      [t("cols.project"), tReports("csvCurrency"), t("cols.budget"), t("cols.approved"), t("cols.inPeriod"), t("cols.pending"), tFinance("available"), t("cols.executed"), t("cols.physical"), t("cols.gap"), t("cols.cpi")],
      report.rows.map((r) => [r.name, "COP", r.budget, r.approvedTotal, r.approvedInPeriod, r.pending, r.available, r.executedPct, r.physicalProgress, r.gap, r.cpi])
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <ReportKpi label={t("kpis.budget")}>
          <AnimatedNumber value={kpis.totalBudget} format={(v) => formatCOP(v, { compact: true })} />
        </ReportKpi>
        <ReportKpi label={t("kpis.approved")} hint={pct(kpis.totalBudget ? (kpis.approvedTotal / kpis.totalBudget) * 100 : 0)}>
          <AnimatedNumber value={kpis.approvedTotal} format={(v) => formatCOP(v, { compact: true })} />
        </ReportKpi>
        <ReportKpi label={t("kpis.inPeriod")} tone="text-accent">
          <AnimatedNumber value={kpis.approvedInPeriod} format={(v) => formatCOP(v, { compact: true })} />
        </ReportKpi>
        <ReportKpi label={t("kpis.pending")} tone={kpis.pending > 0 ? "text-warning" : undefined}>
          <AnimatedNumber value={kpis.pending} format={(v) => formatCOP(v, { compact: true })} />
        </ReportKpi>
        <ReportKpi
          label={t("kpis.cpi")}
          tone={kpis.cpi === null ? "text-ink-muted" : kpis.cpi >= 1 ? "text-success" : kpis.cpi >= 0.9 ? "text-warning" : "text-critical"}
          hint={<InfoTooltip text={tFinance("cpiTooltip")} label={tFinance("cpi")} />}
        >
          {cpi(kpis.cpi)}
        </ReportKpi>
        <ReportKpi label={t("kpis.overrun")} tone={kpis.overrunProjects > 0 ? "text-critical" : "text-success"} hint={`${t("kpis.transfers")}: ${formatCOP(kpis.transfersInPeriod, { compact: true })}`}>
          {format.number(kpis.overrunProjects)}
        </ReportKpi>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_1fr]">
        <ChartCard title={t("chart")}>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={report.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="financialFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--success)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(v: string) => day(v)} tick={axisTick} stroke="var(--line)" minTickGap={24} />
                <YAxis width={64} tickFormatter={(v: number) => formatCOP(v, { compact: true })} tick={axisTick} stroke="var(--line)" />
                <Tooltip labelFormatter={(v) => day(String(v), true)} formatter={(value) => [cop(Number(value)), t("kpis.approved")]} contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="approved" stroke="var(--success)" strokeWidth={2} fill="url(#financialFill)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title={t("byCategory")}>
          {report.byCategory.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-ink-muted">{tReports("empty")}</p>
          ) : (
            <div className="flex flex-col items-center gap-4 sm:flex-row xl:flex-col 2xl:flex-row">
              <div className="h-44 w-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={report.byCategory} dataKey="amount" nameKey="category" innerRadius="60%" outerRadius="100%" paddingAngle={2} stroke="var(--surface)" isAnimationActive={false}>
                      {report.byCategory.map((c, i) => (
                        <Cell key={c.category} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [cop(Number(value)), tCategory(String(name))]} contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="w-full space-y-1.5 text-sm">
                {report.byCategory.map((c, i) => (
                  <li key={c.category} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }} aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-ink">{tCategory(c.category)}</span>
                    <span className="font-mono-data text-xs text-ink-muted">{pct(categoryTotal ? (c.amount / categoryTotal) * 100 : 0)}</span>
                    <span className="font-mono-data text-xs text-ink">{formatCOP(c.amount, { compact: true })}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ChartCard>
      </div>

      <TableCard title={t("cols.project")} onExport={report.rows.length ? handleExport : undefined}>
        <DataTable<Row>
          rows={report.rows}
          rowKey={(r) => r.projectId}
          columns={[
            {
              id: "project",
              header: t("cols.project"),
              primary: true,
              accessor: (r) => (
                <div className="min-w-0">
                  <Link href={`/projects/${r.projectId}`} className="block truncate font-medium text-ink hover:text-accent">
                    {r.name}
                  </Link>
                  <p className="text-xs text-ink-muted">{tStatus(r.status)}</p>
                </div>
              ),
            },
            { id: "budget", header: t("cols.budget"), align: "right", accessor: (r) => <span className="whitespace-nowrap font-mono-data">{cop(r.budget)}</span> },
            { id: "approved", header: t("cols.approved"), align: "right", accessor: (r) => <span className="whitespace-nowrap font-mono-data">{cop(r.approvedTotal)}</span> },
            { id: "period", header: t("cols.inPeriod"), align: "right", accessor: (r) => <span className="whitespace-nowrap font-mono-data text-accent">{cop(r.approvedInPeriod)}</span> },
            {
              id: "pending",
              header: t("cols.pending"),
              align: "right",
              accessor: (r) => <span className={`whitespace-nowrap font-mono-data ${r.pending > 0 ? "text-warning" : "text-ink-muted"}`}>{cop(r.pending)}</span>,
            },
            {
              id: "executed",
              header: `${t("cols.executed")} / ${t("cols.physical")}`,
              accessor: (r) => (
                <div className="w-32">
                  <div className="flex justify-between font-mono-data text-xs">
                    <span className={r.gap > 10 ? "text-critical" : "text-ink"}>{pct(r.executedPct)}</span>
                    <span className="text-ink-muted">{pct(r.physicalProgress)}</span>
                  </div>
                  <div className="mt-1 space-y-0.5" aria-hidden>
                    <div className="h-1.5 rounded-full bg-surface-2">
                      <div className={`h-full rounded-full ${r.gap > 10 ? "bg-critical" : "bg-success"}`} style={{ width: `${Math.min(100, r.executedPct)}%` }} />
                    </div>
                    <div className="h-1 rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, r.physicalProgress)}%` }} />
                    </div>
                  </div>
                </div>
              ),
            },
            {
              id: "cpi",
              header: t("cols.cpi"),
              align: "right",
              accessor: (r) => (
                <span className={`font-mono-data font-semibold ${r.cpi === null ? "text-ink-muted" : r.cpi >= 1 ? "text-success" : r.cpi >= 0.9 ? "text-warning" : "text-critical"}`}>
                  {cpi(r.cpi)}
                </span>
              ),
            },
          ]}
        />
      </TableCard>
    </div>
  );
}
