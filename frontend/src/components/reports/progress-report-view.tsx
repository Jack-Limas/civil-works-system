"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DataTable } from "@/components/ui/data-table";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Link } from "@/i18n/navigation";
import { exportCsv } from "@/lib/export-csv";
import { ChartCard, ReportKpi, TableCard, axisTick, tooltipStyle, useDayLabel } from "./report-ui";
import type { ProgressReport } from "@/types/reports";

type Row = ProgressReport["rows"][number];

export function ProgressReportView({ report }: { report: ProgressReport }) {
  const t = useTranslations("reports.progress");
  const tStatus = useTranslations("projects.status");
  const tCsv = useTranslations("csv");
  const format = useFormatter();
  const day = useDayLabel();
  const pct = (v: number) => `${format.number(v, { maximumFractionDigits: 1 })} %`;
  const int = (v: number) => format.number(Math.round(v));
  const { kpis } = report;

  const chartRows = report.rows.map((r) => ({ name: r.name, real: r.progress, expected: r.expected }));

  function handleExport() {
    exportCsv(
      `obraiq-${tCsv("progress")}-${report.period.from}_${report.period.to}`,
      [t("cols.project"), t("cols.status"), t("cols.responsible"), t("cols.progress"), t("cols.expected"), t("cols.delay"), t("cols.gain"), t("cols.activities"), t("cols.lastActivity"), t("cols.daysRemaining")],
      report.rows.map((r) => [
        r.name,
        tStatus(r.status),
        r.responsible,
        r.progress,
        r.expected,
        r.delay,
        r.gainInPeriod,
        r.activitiesInPeriod,
        r.lastActivity ? `${r.lastActivity.date.slice(0, 10)} ${r.lastActivity.name}` : "",
        r.daysRemaining,
      ])
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <ReportKpi label={t("kpis.projects")}>
          <AnimatedNumber value={kpis.projects} format={int} />
        </ReportKpi>
        <ReportKpi label={t("kpis.averageProgress")} tone="text-accent">
          <AnimatedNumber value={kpis.averageProgress} format={pct} />
        </ReportKpi>
        <ReportKpi label={t("kpis.onTrack")} tone="text-success">
          <AnimatedNumber value={kpis.onTrack} format={int} />
        </ReportKpi>
        <ReportKpi label={t("kpis.delayed")} tone={kpis.delayed > 0 ? "text-critical" : undefined}>
          <AnimatedNumber value={kpis.delayed} format={int} />
        </ReportKpi>
        <ReportKpi label={t("kpis.activities")}>
          <AnimatedNumber value={kpis.activitiesInPeriod} format={int} />
        </ReportKpi>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ChartCard title={t("progressChart")}>
          <div className="w-full" style={{ height: Math.max(220, chartRows.length * 48) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartRows} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barGap={2}>
                <CartesianGrid horizontal={false} stroke="var(--line)" strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={axisTick} stroke="var(--line)" />
                <YAxis type="category" dataKey="name" width={130} tick={axisTick} stroke="var(--line)" tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 17)}…` : v)} />
                <Tooltip
                  cursor={{ fill: "var(--surface-2)" }}
                  formatter={(value, name) => [pct(Number(value)), name === "real" ? t("real") : t("expected")]}
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: "var(--ink)", fontWeight: 600 }}
                />
                <Legend formatter={(v) => <span style={{ color: "var(--ink-muted)", fontSize: 12 }}>{v === "real" ? t("real") : t("expected")}</span>} />
                <Bar dataKey="real" fill="var(--accent)" radius={[0, 4, 4, 0]} maxBarSize={14} isAnimationActive={false} />
                <Bar dataKey="expected" fill="var(--line)" radius={[0, 4, 4, 0]} maxBarSize={14} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title={t("chart")}>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={report.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="progressFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(v: string) => day(v)} tick={axisTick} stroke="var(--line)" minTickGap={24} />
                <YAxis width={32} allowDecimals={false} tick={axisTick} stroke="var(--line)" />
                <Tooltip labelFormatter={(v) => day(String(v), true)} formatter={(value) => [int(Number(value)), t("kpis.activities")]} contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="activities" stroke="var(--accent)" strokeWidth={2} fill="url(#progressFill)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
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
                  <p className="truncate text-xs text-ink-muted">
                    {tStatus(r.status)} · {r.responsible}
                  </p>
                </div>
              ),
            },
            {
              id: "progress",
              header: t("cols.progress"),
              accessor: (r) => (
                <div className="w-28">
                  <div className="flex justify-between font-mono-data text-xs">
                    <span className="text-ink">{pct(r.progress)}</span>
                    <span className="text-ink-muted">{pct(r.expected)}</span>
                  </div>
                  <div className="relative mt-1 h-1.5 rounded-full bg-surface-2" aria-hidden>
                    <div className={`h-full rounded-full ${r.onTrack ? "bg-accent" : "bg-critical"}`} style={{ width: `${Math.min(100, r.progress)}%` }} />
                    <div className="absolute -top-0.5 h-2.5 w-0.5 rounded bg-ink-muted" style={{ left: `${Math.min(100, r.expected)}%` }} />
                  </div>
                </div>
              ),
            },
            {
              id: "delay",
              header: t("cols.delay"),
              align: "right",
              accessor: (r) => (
                <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${r.onTrack ? "bg-success/15 text-success" : "bg-critical/15 text-critical"}`}>
                  {r.onTrack ? t("onTrack") : t("late")} {r.delay > 0 && `· −${pct(r.delay)}`}
                </span>
              ),
            },
            { id: "gain", header: t("cols.gain"), align: "right", accessor: (r) => <span className="font-mono-data">+{pct(r.gainInPeriod)}</span> },
            { id: "activities", header: t("cols.activities"), align: "right", accessor: (r) => <span className="font-mono-data">{int(r.activitiesInPeriod)}</span> },
            {
              id: "last",
              header: t("cols.lastActivity"),
              accessor: (r) =>
                r.lastActivity ? (
                  <div className="min-w-0">
                    <p className="truncate text-sm">{r.lastActivity.name}</p>
                    <p className="text-xs text-ink-muted">{day(r.lastActivity.date, true)}</p>
                  </div>
                ) : (
                  <span className="text-ink-muted">—</span>
                ),
            },
            {
              id: "days",
              header: t("cols.daysRemaining"),
              align: "right",
              accessor: (r) =>
                r.daysRemaining < 0 && r.status !== "FINISHED" ? (
                  <span className="font-medium text-critical">{t("overdue")}</span>
                ) : (
                  <span className="font-mono-data">{r.status === "FINISHED" ? "—" : int(r.daysRemaining)}</span>
                ),
            },
          ]}
        />
      </TableCard>
    </div>
  );
}
