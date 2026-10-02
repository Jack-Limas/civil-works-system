"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function BudgetChart({ total, executed }: { total: number; executed: number }) {
  const data = [{ name: "Presupuesto", Total: total, Ejecutado: executed }];

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="Total" fill="#6366f1" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Ejecutado" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}