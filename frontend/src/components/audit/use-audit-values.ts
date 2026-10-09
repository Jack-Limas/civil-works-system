"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useFormatCOP } from "@/lib/format";
import type { AuditLogEntry } from "@/lib/audit-service";
import { BUSINESS_TIME_ZONE, HIDDEN_VALUE_KEYS, useAuditLabels } from "./audit-labels";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/;

/**
 * Turns audit metadata values into readable text: enums go through their
 * translated keys (by module), money through formatCOP and dates through the
 * business timezone. Unknown values are shown as-is, never hidden.
 */
export function useAuditValues() {
  const labels = useAuditLabels();
  const tAudit = useTranslations("audit");
  const tRoles = useTranslations("common.roles");
  const tIncidentStatus = useTranslations("incidents.statuses");
  const tIncidentType = useTranslations("incidents.types");
  const tPriority = useTranslations("incidents.priorities");
  const tProjectStatus = useTranslations("projects.status");
  const tExpenseCategory = useTranslations("expenses.categories");
  const tMovement = useTranslations("inventory.movementType");
  const formatCOP = useFormatCOP();
  const format = useFormatter();

  function value(key: string, raw: unknown, entityType: string | null): string {
    if (raw === null || raw === undefined || raw === "") return "—";
    if (Array.isArray(raw)) return raw.map((v) => (typeof v === "string" ? labels.key(v) : String(v))).join(", ");
    if (typeof raw === "boolean") return raw ? "✓" : "✗";
    if (typeof raw === "number") return key === "amount" || key === "unitCost" ? formatCOP(raw) : format.number(raw);
    if (typeof raw !== "string") return JSON.stringify(raw);

    const has = (t: { has: (k: string) => boolean }, k: string) => t.has(k);
    if (key === "role" && has(tRoles, raw)) return tRoles(raw);
    if ((key === "fromStatus" || key === "toStatus" || key === "status") && entityType === "incident" && has(tIncidentStatus, raw)) return tIncidentStatus(raw);
    if ((key === "fromStatus" || key === "toStatus" || key === "status") && entityType === "project" && has(tProjectStatus, raw)) return tProjectStatus(raw);
    if (key === "priority" && has(tPriority, raw)) return tPriority(raw);
    if (key === "category" && has(tExpenseCategory, raw)) return tExpenseCategory(raw);
    if (key === "type" && entityType === "incident" && has(tIncidentType, raw)) return tIncidentType(raw);
    if (key === "type" && entityType === "material" && has(tMovement, raw)) return tMovement(raw);
    if (key === "reason" && tAudit.has(`reasons.${raw}`)) return tAudit(`reasons.${raw}`);
    if (ISO_DATE.test(raw)) {
      const date = new Date(raw.length === 10 ? `${raw}T12:00:00Z` : raw);
      return raw.length === 10
        ? format.dateTime(date, { dateStyle: "medium", timeZone: "UTC" })
        : format.dateTime(date, { dateStyle: "medium", timeStyle: "short", timeZone: BUSINESS_TIME_ZONE });
    }
    return raw;
  }

  /** One-line summary for the table: the change, the transition or the main figures. */
  function summary(entry: AuditLogEntry): string {
    const m = entry.metadata;
    if (!m) return "";
    if (m.fromStatus && m.toStatus) return `${value("fromStatus", m.fromStatus, entry.entityType)} → ${value("toStatus", m.toStatus, entry.entityType)}`;
    if (m.after && typeof m.after === "object") {
      const keys = [...Object.keys(m.after), ...(Array.isArray(m.keys) ? (m.keys as string[]).filter((k) => !(k in (m.after ?? {}))) : [])];
      return keys.map((k) => labels.key(k)).join(", ");
    }
    const parts: string[] = [];
    for (const key of ["name", "materialName", "residentName", "projectName", "amount", "quantity", "attempts", "reason"]) {
      if (m[key] !== undefined && m[key] !== null) parts.push(key === "attempts" ? `${labels.key(key)}: ${value(key, m[key], entry.entityType)}` : value(key, m[key], entry.entityType));
    }
    if (Array.isArray(m.keys) && parts.length === 0) parts.push((m.keys as string[]).map((k) => labels.key(k)).join(", "));
    return parts.slice(0, 3).join(" · ");
  }

  const hidden = (key: string) => HIDDEN_VALUE_KEYS.has(key);

  return { value, summary, hidden };
}
