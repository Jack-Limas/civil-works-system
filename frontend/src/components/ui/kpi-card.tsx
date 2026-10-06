"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconColor: "accent" | "success" | "critical" | "brand";
  trend?: string;
  trendPositive?: boolean;
  index?: number;
}

const ICON_BG = {
  accent: "bg-accent/15 text-accent",
  success: "bg-success/15 text-success",
  critical: "bg-critical/15 text-critical",
  brand: "bg-brand/10 text-brand",
};

export function KpiCard({ label, value, icon: Icon, iconColor, trend, trendPositive, index = 0 }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3, ease: "easeOut" }}
      className="rounded-xl border border-line bg-surface p-4"
    >
      <div className="mb-3 flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${ICON_BG[iconColor]}`}>
          <Icon size={16} />
        </div>
      </div>
      <p className="font-mono-data text-3xl font-semibold tabular-nums">{value}</p>
      {trend && (
        <p className={`mt-1 text-xs ${trendPositive ? "text-success" : "text-ink-muted"}`}>{trend}</p>
      )}
    </motion.div>
  );
}