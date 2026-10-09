"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, EyeOff } from "lucide-react";
import type { AuditLogEntry } from "@/lib/audit-service";
import { actionTone, useAuditLabels } from "./audit-labels";
import { useAuditValues } from "./use-audit-values";

/** Read-only event view: who, when, what changed (before → after) and the rest of the data. */
export function AuditDetail({ entry }: { entry: AuditLogEntry }) {
  const t = useTranslations("audit.detail");
  const labels = useAuditLabels();
  const values = useAuditValues();
  const metadata = entry.metadata ?? {};
  const before = (metadata.before ?? {}) as Record<string, unknown>;
  const after = (metadata.after ?? {}) as Record<string, unknown>;
  const changeKeys = Object.keys(after);
  // Personal data changed (documented by key only)
  const hiddenKeys = Array.isArray(metadata.keys) ? (metadata.keys as string[]).filter((k) => values.hidden(k) && !(k in after)) : [];
  const rest = Object.entries(metadata).filter(([k]) => k !== "before" && k !== "after" && !(k === "keys" && hiddenKeys.length > 0));

  return (
    <div className="space-y-5 text-sm">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${actionTone(entry.action)}`} aria-hidden />
        <p className="text-base font-semibold text-ink">{labels.action(entry.action)}</p>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-ink-muted">{t("when")}</dt>
          <dd className="text-ink">{labels.moment(entry.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">{t("who")}</dt>
          <dd className="text-ink">
            {labels.actor(entry)}
            <span className="block text-xs text-ink-muted">{entry.actorEmail}</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">{t("entity")}</dt>
          <dd className="text-ink">
            {labels.entity(entry.entityType)}
            {entry.entityId && <span className="block truncate font-mono-data text-xs text-ink-muted">{entry.entityId}</span>}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">{t("ip")}</dt>
          <dd className="font-mono-data text-ink">{entry.ip ?? "—"}</dd>
        </div>
      </dl>

      {(changeKeys.length > 0 || hiddenKeys.length > 0) && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">{t("changes")}</h3>
          <div className="overflow-hidden rounded-lg border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2 text-xs text-ink-muted">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">{t("field")}</th>
                  <th scope="col" className="px-3 py-2 font-medium">{t("before")}</th>
                  <th scope="col" className="w-6 px-0 py-2" aria-hidden />
                  <th scope="col" className="px-3 py-2 font-medium">{t("after")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {changeKeys.map((key) => (
                  <tr key={key}>
                    <th scope="row" className="px-3 py-2 font-medium text-ink">{labels.key(key)}</th>
                    <td className="px-3 py-2 text-critical line-through decoration-critical/40">{values.value(key, before[key], entry.entityType)}</td>
                    <td className="px-0 py-2 text-ink-muted" aria-hidden>
                      <ArrowRight size={14} />
                    </td>
                    <td className="px-3 py-2 text-success">{values.value(key, after[key], entry.entityType)}</td>
                  </tr>
                ))}
                {hiddenKeys.map((key) => (
                  <tr key={key}>
                    <th scope="row" className="px-3 py-2 font-medium text-ink">{labels.key(key)}</th>
                    <td colSpan={3} className="px-3 py-2 text-ink-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <EyeOff size={13} aria-hidden /> {t("hiddenValue")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">{t("data")}</h3>
        {rest.length === 0 ? (
          <p className="text-ink-muted">{t("noData")}</p>
        ) : (
          <dl className="divide-y divide-line rounded-lg border border-line">
            {rest.map(([key, raw]) => (
              <div key={key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-3 px-3 py-2">
                <dt className="text-ink-muted">{labels.key(key)}</dt>
                <dd className="break-words text-ink">{values.value(key, raw, entry.entityType)}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {entry.userAgent && (
        <p className="break-words text-xs text-ink-muted">
          <span className="font-medium">{t("userAgent")}:</span> {entry.userAgent}
        </p>
      )}
    </div>
  );
}
