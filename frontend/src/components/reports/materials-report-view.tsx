"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DataTable } from "@/components/ui/data-table";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { CoverageMeter, MaterialStatusBadge } from "@/components/inventory/material-status";
import { Link } from "@/i18n/navigation";
import { exportCsv } from "@/lib/export-csv";
import { ChartCard, ReportKpi, TableCard, axisTick, tooltipStyle, useDayLabel } from "./report-ui";
import type { MaterialsReport } from "@/types/reports";

type Row = MaterialsReport["rows"][number];

export function MaterialsReportView({ report }: { report: MaterialsReport }) {
  const t = useTranslations("reports.materials");
  const tReports = useTranslations("reports");
  const tInventory = useTranslations("inventory");
  const tCsv = useTranslations("csv");
  const format = useFormatter();
  const day = useDayLabel();
  const qty = (v: number) => format.number(v, { maximumFractionDigits: 2 });
  const int = (v: number) => format.number(Math.round(v));
  const { kpis } = report;
  const label = (key: string) => (key === "in" ? t("kpis.in") : key === "out" ? t("kpis.out") : key === "outMovements" ? t("cols.outMovements") : t("cols.materialsCount"));

  function handleExport() {
    exportCsv(
      `obraiq-${tCsv("materials")}-${report.period.from}_${report.period.to}`,
      [t("cols.material"), t("cols.category"), tInventory("fields.unit"), t("cols.in"), t("cols.out"), t("cols.net"), t("cols.stock"), t("cols.status"), t("cols.coverage")],
      report.rows.map((r) => [
        r.name,
        r.category ? tInventory(`categories.${r.category}`) : tInventory("list.noCategory"),
        r.unit,
        r.in,
        r.out,
        r.net,
        r.stock,
        tInventory(`status.${r.status}`),
        r.coverageDays,
      ])
    );
  }

  return (
    <div className="space-y-5">
      <div className={`grid grid-cols-2 gap-3 md:grid-cols-3 ${kpis.rejectedExpenseWarnings !== undefined ? "xl:grid-cols-6" : "xl:grid-cols-5"}`}>
        <ReportKpi label={t("kpis.movements")}>
          <AnimatedNumber value={kpis.movements} format={int} />
        </ReportKpi>
        <ReportKpi label={t("kpis.in")} tone="text-success">
          <AnimatedNumber value={kpis.inMovements} format={int} />
        </ReportKpi>
        <ReportKpi label={t("kpis.out")} tone="text-accent">
          <AnimatedNumber value={kpis.outMovements} format={int} />
        </ReportKpi>
        <ReportKpi label={t("kpis.materials")}>
          <AnimatedNumber value={kpis.materialsMoved} format={int} />
        </ReportKpi>
        <ReportKpi label={t("kpis.critical")} tone={kpis.criticalMaterials > 0 ? "text-critical" : "text-success"}>
          <AnimatedNumber value={kpis.criticalMaterials} format={int} />
        </ReportKpi>
        {kpis.rejectedExpenseWarnings !== undefined && (
          <ReportKpi label={t("kpis.warnings")} tone={kpis.rejectedExpenseWarnings > 0 ? "text-critical" : undefined} hint={tInventory("ledger.warning")}>
            <AnimatedNumber value={kpis.rejectedExpenseWarnings} format={int} />
          </ReportKpi>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_1fr]">
        <ChartCard title={t("chart")}>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(v: string) => day(v)} tick={axisTick} stroke="var(--line)" minTickGap={24} />
                <YAxis width={40} allowDecimals={false} tick={axisTick} stroke="var(--line)" />
                <Tooltip
                  cursor={{ fill: "var(--surface-2)" }}
                  labelFormatter={(v) => day(String(v), true)}
                  formatter={(value, name) => [int(Number(value)), label(String(name))]}
                  contentStyle={tooltipStyle}
                />
                <Legend formatter={(v) => <span style={{ color: "var(--ink-muted)", fontSize: 12 }}>{label(String(v))}</span>} />
                <Bar dataKey="in" stackId="m" fill="var(--success)" maxBarSize={18} isAnimationActive={false} />
                <Bar dataKey="out" stackId="m" fill="var(--accent)" radius={[3, 3, 0, 0]} maxBarSize={18} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title={t("byProject")}>
          {report.byProject.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-ink-muted">{tReports("empty")}</p>
          ) : (
            <div className="w-full" style={{ height: Math.max(180, report.byProject.length * 48) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.byProject} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke="var(--line)" strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} tick={axisTick} stroke="var(--line)" />
                  <YAxis type="category" dataKey="name" width={120} tick={axisTick} stroke="var(--line)" tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 15)}…` : v)} />
                  <Tooltip cursor={{ fill: "var(--surface-2)" }} formatter={(value, name) => [int(Number(value)), label(String(name))]} contentStyle={tooltipStyle} labelStyle={{ color: "var(--ink)", fontWeight: 600 }} />
                  <Bar dataKey="outMovements" fill="var(--accent)" radius={[0, 4, 4, 0]} maxBarSize={14} isAnimationActive={false} />
                  <Bar dataKey="materials" fill="var(--ai)" radius={[0, 4, 4, 0]} maxBarSize={14} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>

      <TableCard title={t("cols.material")} onExport={report.rows.length ? handleExport : undefined}>
        <DataTable<Row>
          rows={report.rows}
          rowKey={(r) => r.materialId}
          emptyMessage={tReports("empty")}
          columns={[
            {
              id: "material",
              header: t("cols.material"),
              primary: true,
              accessor: (r) => (
                <div className="min-w-0">
                  <Link href={`/materials/${r.materialId}`} className="block truncate font-medium text-ink hover:text-accent">
                    {r.name}
                  </Link>
                  <p className="truncate text-xs text-ink-muted">{r.category ? tInventory(`categories.${r.category}`) : tInventory("list.noCategory")}</p>
                </div>
              ),
            },
            { id: "in", header: t("cols.in"), align: "right", accessor: (r) => <span className="whitespace-nowrap font-mono-data text-success">+{qty(r.in)}</span> },
            { id: "out", header: t("cols.out"), align: "right", accessor: (r) => <span className="whitespace-nowrap font-mono-data text-accent">−{qty(r.out)}</span> },
            {
              id: "net",
              header: t("cols.net"),
              align: "right",
              accessor: (r) => (
                <span className={`whitespace-nowrap font-mono-data font-semibold ${r.net < 0 ? "text-accent" : "text-success"}`}>
                  {r.net > 0 ? "+" : ""}
                  {qty(r.net)} <span className="text-xs font-normal text-ink-muted">{r.unit}</span>
                </span>
              ),
            },
            {
              id: "stock",
              header: t("cols.stock"),
              align: "right",
              accessor: (r) => (
                <span className="whitespace-nowrap font-mono-data">
                  {qty(r.stock)} <span className="text-xs text-ink-muted">{r.unit}</span>
                </span>
              ),
            },
            { id: "status", header: t("cols.status"), accessor: (r) => <MaterialStatusBadge status={r.status} /> },
            { id: "coverage", header: t("cols.coverage"), accessor: (r) => <CoverageMeter days={r.coverageDays} status={r.status} compact /> },
          ]}
        />
      </TableCard>
    </div>
  );
}
