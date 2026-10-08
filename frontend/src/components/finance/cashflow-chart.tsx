"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFormatCOP } from "@/lib/format";
import { CashflowMonth } from "@/types/finance";

/** Monthly transfers to residents vs approved expenses. */
export function CashflowChart({ series }: { series: CashflowMonth[] }) {
  const t = useTranslations("cashflow");
  const format = useFormatter();
  const formatCOP = useFormatCOP();

  const data = series.map((m) => {
    const [year, month] = m.month.split("-").map(Number);
    return {
      label: format.dateTime(new Date(Date.UTC(year, month - 1, 15)), { month: "short", timeZone: "UTC" }),
      transfers: m.transfers,
      expenses: m.expenses,
    };
  });

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
          <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fill: "var(--ink-muted)", fontSize: 11 }} stroke="var(--line)" />
          <YAxis
            width={64}
            tickFormatter={(v: number) => formatCOP(v, { compact: true })}
            tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
            stroke="var(--line)"
          />
          <Tooltip
            cursor={{ fill: "var(--surface-2)" }}
            formatter={(value, name) => [formatCOP(Number(value)), name === "transfers" ? t("transfers") : t("expenses")]}
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
                {value === "transfers" ? t("transfers") : t("expenses")}
              </span>
            )}
          />
          <Bar dataKey="transfers" fill="var(--ai)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          <Bar dataKey="expenses" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
