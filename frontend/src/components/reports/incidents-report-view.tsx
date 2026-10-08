"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DataTable } from "@/components/ui/data-table";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Link } from "@/i18n/navigation";
import { exportCsv } from "@/lib/export-csv";
import { ChartCard, ReportKpi, TableCard, axisTick, tooltipStyle, useDayLabel } from "./report-ui";
import type { IncidentPriority, IncidentStatus } from "@/lib/incidents-service";
import type { IncidentsReport } from "@/types/reports";

type Row = IncidentsReport["rows"][number];

const SLICE_COLORS = ["var(--critical)", "var(--warning)", "var(--accent)", "var(--ai)", "var(--success)", "var(--ink-muted)", "var(--line)"];

const PRIORITY_TONE: Record<IncidentPriority, string> = {
  HIGH: "bg-critical/15 text-critical",
  MEDIUM: "bg-warning/15 text-warning",
  LOW: "bg-surface-2 text-ink-muted",
};

const STATUS_TONE: Record<IncidentStatus, string> = {
  OPEN: "text-critical",
  IN_REVIEW: "text-warning",
  RESOLVED: "text-success",
};

export function IncidentsReportView({ report }: { report: IncidentsReport }) {
  const t = useTranslations("reports.incidents");
  const tReports = useTranslations("reports");
  const tIncidents = useTranslations("incidents");
  const tCsv = useTranslations("csv");
  const format = useFormatter();
  const day = useDayLabel();
  const int = (v: number) => format.number(Math.round(v));
  const { kpis } = report;

  function handleExport() {
    exportCsv(
      `obraiq-${tCsv("incidents")}-${report.period.from}_${report.period.to}`,
      [t("cols.date"), t("cols.project"), t("cols.type"), t("cols.priority"), t("cols.status"), t("cols.description")],
      report.rows.map((r) => [
        r.date.slice(0, 10),
        r.project.name,
        tIncidents(`types.${r.type}`),
        tIncidents(`priorities.${r.priority}`),
        tIncidents(`statuses.${r.status}`),
        r.description,
      ])
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <ReportKpi label={t("kpis.total")}>
          <AnimatedNumber value={kpis.total} format={int} />
        </ReportKpi>
        <ReportKpi label={t("kpis.open")} tone={kpis.open > 0 ? "text-critical" : undefined}>
          <AnimatedNumber value={kpis.open} format={int} />
        </ReportKpi>
        <ReportKpi label={t("kpis.inReview")} tone={kpis.inReview > 0 ? "text-warning" : undefined}>
          <AnimatedNumber value={kpis.inReview} format={int} />
        </ReportKpi>
        <ReportKpi label={t("kpis.resolved")} tone="text-success">
          <AnimatedNumber value={kpis.resolved} format={int} />
        </ReportKpi>
        <ReportKpi label={t("kpis.high")} tone={kpis.highPriority > 0 ? "text-critical" : undefined}>
          <AnimatedNumber value={kpis.highPriority} format={int} />
        </ReportKpi>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_1fr]">
        <ChartCard title={t("chart")}>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(v: string) => day(v)} tick={axisTick} stroke="var(--line)" minTickGap={24} />
                <YAxis width={32} allowDecimals={false} tick={axisTick} stroke="var(--line)" />
                <Tooltip
                  cursor={{ fill: "var(--surface-2)" }}
                  labelFormatter={(v) => day(String(v), true)}
                  formatter={(value) => [int(Number(value)), t("kpis.total")]}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="incidents" fill="var(--critical)" radius={[3, 3, 0, 0]} maxBarSize={18} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title={t("byType")}>
          {report.byType.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-ink-muted">{tReports("empty")}</p>
          ) : (
            <div className="flex flex-col items-center gap-4 sm:flex-row xl:flex-col 2xl:flex-row">
              <div className="h-44 w-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={report.byType} dataKey="count" nameKey="type" innerRadius="60%" outerRadius="100%" paddingAngle={2} stroke="var(--surface)" isAnimationActive={false}>
                      {report.byType.map((b, i) => (
                        <Cell key={b.type} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [int(Number(value)), tIncidents(`types.${String(name)}`)]} contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="w-full space-y-1.5 text-sm">
                {report.byType.map((b, i) => (
                  <li key={b.type} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }} aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-ink">{tIncidents(`types.${b.type}`)}</span>
                    <span className="font-mono-data text-xs text-ink">{int(b.count)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ChartCard>
      </div>

      <TableCard title={t("kpis.total")} onExport={report.rows.length ? handleExport : undefined}>
        <DataTable<Row>
          rows={report.rows}
          rowKey={(r) => r.id}
          emptyMessage={tReports("empty")}
          columns={[
            {
              id: "description",
              header: t("cols.description"),
              primary: true,
              accessor: (r) => (
                <div className="min-w-0 max-w-md">
                  <p className="line-clamp-2 text-sm text-ink">{r.description}</p>
                  <Link href={`/projects/${r.project.id}`} className="block truncate text-xs text-ink-muted hover:text-accent">
                    {r.project.name}
                  </Link>
                </div>
              ),
            },
            { id: "date", header: t("cols.date"), accessor: (r) => <span className="whitespace-nowrap">{day(r.date, true)}</span> },
            { id: "type", header: t("cols.type"), accessor: (r) => tIncidents(`types.${r.type}`) },
            {
              id: "priority",
              header: t("cols.priority"),
              accessor: (r) => (
                <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_TONE[r.priority]}`}>{tIncidents(`priorities.${r.priority}`)}</span>
              ),
            },
            {
              id: "status",
              header: t("cols.status"),
              accessor: (r) => <span className={`whitespace-nowrap text-sm font-medium ${STATUS_TONE[r.status]}`}>{tIncidents(`statuses.${r.status}`)}</span>,
            },
          ]}
        />
      </TableCard>
    </div>
  );
}
