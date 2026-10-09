"use client";

import { useTranslations } from "next-intl";
import { CircleHelp, Clock, CloudRain, PackageX, Shuffle, UserX, Wrench, type LucideIcon } from "lucide-react";
import type { IncidentPriority, IncidentStatus, IncidentType } from "@/lib/incidents-service";

export const PRIORITY_TONE: Record<IncidentPriority, string> = {
  HIGH: "bg-critical/15 text-critical",
  MEDIUM: "bg-warning/15 text-warning",
  LOW: "bg-surface-2 text-ink-muted",
};

/** Dot + text colour per lifecycle step (IN_REVIEW is "in progress"). */
export const STATUS_TONE: Record<IncidentStatus, { pill: string; dot: string }> = {
  OPEN: { pill: "bg-critical/10 text-critical", dot: "bg-critical" },
  IN_REVIEW: { pill: "bg-warning/15 text-warning", dot: "bg-warning" },
  RESOLVED: { pill: "bg-success/15 text-success", dot: "bg-success" },
};

export const TYPE_ICON: Record<IncidentType, LucideIcon> = {
  MATERIAL_SHORTAGE: PackageX,
  ACTIVITY_DELAY: Clock,
  WEATHER: CloudRain,
  EQUIPMENT_DAMAGE: Wrench,
  STAFF_ISSUE: UserX,
  ACTIVITY_CHANGE: Shuffle,
  OTHER: CircleHelp,
};

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  const t = useTranslations("incidents.statuses");
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[status].pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_TONE[status].dot}`} aria-hidden />
      {t(status)}
    </span>
  );
}

export function IncidentPriorityBadge({ priority }: { priority: IncidentPriority }) {
  const t = useTranslations("incidents.priorities");
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_TONE[priority]}`}>{t(priority)}</span>;
}

export function IncidentTypeIcon({ type, size = 18, className = "" }: { type: IncidentType; size?: number; className?: string }) {
  const Icon = TYPE_ICON[type];
  return <Icon size={size} className={className} aria-hidden />;
}
