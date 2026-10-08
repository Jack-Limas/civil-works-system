"use client";

import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ProjectFinance } from "@/types/finance";

/** Financial progress this many points above physical progress is flagged (same threshold as the alert engine). */
const GAP_THRESHOLD = 15;
const ROW_HEIGHT = 46;

const truncate = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

export function ProgressComparisonChart({ projects }: { projects: ProjectFinance[] }) {
  const t = useTranslations("finance.chart");

  if (projects.length === 0) {
    return <p className="py-10 text-center text-sm text-ink-muted">{t("empty")}</p>;
  }

  const data = projects.map((p) => ({
    name: p.name,
    physical: Math.round(p.physicalProgress * 10) / 10,
    financial: p.financialProgress,
    overrun: p.financialProgress - p.physicalProgress > GAP_THRESHOLD,
  }));

  return (
    <div style={{ height: 70 + data.length * ROW_HEIGHT }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 4 }} barGap={2}>
          <CartesianGrid horizontal={false} stroke="var(--line)" strokeDasharray="3 3" />
          <XAxis
            type="number"
            domain={[0, (max: number) => Math.max(100, Math.ceil(max / 10) * 10)]}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
            stroke="var(--line)"
          />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            tickFormatter={(v: string) => truncate(v, 22)}
            tick={{ fill: "var(--ink)", fontSize: 11 }}
            stroke="var(--line)"
          />
          <Tooltip
            cursor={{ fill: "var(--surface-2)" }}
            formatter={(value, name) => [`${value}%`, name === "physical" ? t("physical") : t("financial")]}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              color: "var(--ink)",
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--ink)", fontWeight: 600 }}
          />
          <Legend
            formatter={(value) => (
              <span style={{ color: "var(--ink-muted)", fontSize: 12 }}>
                {value === "physical" ? t("physical") : t("financial")}
              </span>
            )}
          />
          <Bar dataKey="physical" fill="var(--success)" radius={[0, 4, 4, 0]} barSize={12} isAnimationActive={false} />
          <Bar dataKey="financial" fill="var(--accent)" radius={[0, 4, 4, 0]} barSize={12} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.overrun ? "var(--critical)" : "var(--accent)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
