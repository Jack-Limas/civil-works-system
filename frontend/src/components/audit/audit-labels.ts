"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { AuditLogEntry } from "@/lib/audit-service";

/** Business timezone: history is always shown in Bogotá time, whatever the browser says. */
export const BUSINESS_TIME_ZONE = "America/Bogota";

/** Keys whose value is personal data: shown as "changed" only (the API never stores it). */
export const HIDDEN_VALUE_KEYS = new Set(["documentId", "phone"]);

/**
 * Translates audit codes. Unknown actions or keys (e.g. added by a newer
 * backend) fall back to a generic label instead of a raw code.
 */
export function useAuditLabels() {
  const t = useTranslations("audit");
  const format = useFormatter();

  const action = (code: string) => (t.has(`actions.${code}`) ? t(`actions.${code}`) : t("actions.unknown"));
  const entity = (type: string | null) => (type && t.has(`entities.${type}`) ? t(`entities.${type}`) : "—");
  const key = (name: string) => (t.has(`keys.${name}`) ? t(`keys.${name}`) : name);
  const actor = (entry: Pick<AuditLogEntry, "actor" | "actorEmail">) => entry.actor?.name ?? (entry.actorEmail || t("unknownActor"));
  const moment = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short", timeZone: BUSINESS_TIME_ZONE });

  return { action, entity, key, actor, moment };
}

/** Action family for the dot colour: security events stand out. */
export function actionTone(code: string) {
  if (code === "auth.login_failed" || code.endsWith("deactivated") || code === "expense.rejected") return "bg-critical";
  if (code.startsWith("auth.") || code === "user.password_reset") return "bg-ai";
  if (code.startsWith("settings.")) return "bg-warning";
  if (code.endsWith("created") || code.endsWith("approved") || code.endsWith("activated")) return "bg-success";
  return "bg-accent";
}
