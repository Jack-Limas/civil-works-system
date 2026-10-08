"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MaterialDetail } from "@/types/inventory";

const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 8,
  color: "var(--ink)",
  fontSize: 12,
};
const tick = { fill: "var(--ink-muted)", fontSize: 11 };

/** Daily stock rebuilt by the API, with the minimum as a dashed reference line. */
export function StockChart({ series, minimum, unit }: { series: MaterialDetail["series"]; minimum: number; unit: string }) {
  const t = useTranslations("inventory");
  const format = useFormatter();
  const qty = (v: number) => format.number(v, { maximumFractionDigits: 2 });
  const label = (key: string) => format.dateTime(new Date(`${key.slice(0, 10)}T12:00:00Z`), { day: "numeric", month: "short", timeZone: "UTC" });

  return (
    <div className="h-64 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="stockFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={label} tick={tick} stroke="var(--line)" minTickGap={24} />
          <YAxis width={48} tickFormatter={qty} tick={tick} stroke="var(--line)" />
          <Tooltip
            labelFormatter={(v) => label(String(v))}
            formatter={(value, name) => [`${qty(Number(value))} ${unit}`, t(`detail.${name === "stock" ? "stockLine" : name === "in" ? "inBar" : "outBar"}`)]}
            contentStyle={tooltipStyle}
            labelStyle={{ color: "var(--ink)", fontWeight: 600 }}
          />
          {minimum > 0 && (
            <ReferenceLine
              y={minimum}
              stroke="var(--warning)"
              strokeDasharray="5 4"
              label={{ value: t("fields.minimum"), position: "insideTopRight", fill: "var(--warning)", fontSize: 11 }}
            />
          )}
          <Area type="monotone" dataKey="stock" stroke="var(--accent)" strokeWidth={2} fill="url(#stockFill)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Consumption per project in the selected window (horizontal bars). */
export function ConsumptionByProjectChart({ data, unit }: { data: MaterialDetail["consumptionByProject"]; unit: string }) {
  const t = useTranslations("inventory");
  const format = useFormatter();
  const qty = (v: number) => format.number(v, { maximumFractionDigits: 2 });

  return (
    <div className="w-full" style={{ height: Math.max(160, data.length * 44) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke="var(--line)" strokeDasharray="3 3" />
          <XAxis type="number" tickFormatter={qty} tick={tick} stroke="var(--line)" />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={tick}
            stroke="var(--line)"
            tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 15)}…` : v)}
          />
          <Tooltip
            cursor={{ fill: "var(--surface-2)" }}
            formatter={(value) => [`${qty(Number(value))} ${unit}`, t("detail.outBar")]}
            contentStyle={tooltipStyle}
            labelStyle={{ color: "var(--ink)", fontWeight: 600 }}
          />
          <Bar dataKey="quantity" fill="var(--accent)" radius={[0, 4, 4, 0]} maxBarSize={24} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
