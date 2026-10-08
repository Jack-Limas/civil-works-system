"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAlerts, useResolveAlert, Alert } from "@/lib/alerts-service";
import { useAuthStore } from "@/store/auth.store";
import { useApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/store/toast.store";
import { AlertMessage } from "@/components/alerts/alert-message";

const STYLE: Record<Alert["severity"], { border: string; badge: string }> = {
  HIGH: { border: "border-l-critical", badge: "bg-critical text-white" },
  MEDIUM: { border: "border-l-warning", badge: "bg-warning text-white" },
  LOW: { border: "border-l-line", badge: "bg-surface text-ink-muted border border-line" },
};

export function CriticalAlertsWidget() {
  const t = useTranslations("dashboard.alertsWidget");
  const { data: alerts, isLoading } = useAlerts("ACTIVE");
  const resolve = useResolveAlert();
  const isAdmin = useAuthStore((s) => s.user?.role === "ADMIN");
  const errorMessage = useApiErrorMessage();

  function handleResolve(id: string) {
    resolve.mutate(id, {
      onSuccess: () => toast.success(t("resolved")),
      onError: (error) => toast.error(errorMessage(error)),
    });
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle size={16} className="text-critical" aria-hidden />
        <h2 className="text-sm font-semibold text-ink">{t("title")}</h2>
        {alerts && alerts.length > 0 && (
          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-critical px-1 text-xs text-white">
            {alerts.length}
          </span>
        )}
      </div>

      {isLoading && (
        <div className="space-y-2" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-surface-2 motion-reduce:animate-none" />
          ))}
        </div>
      )}
      {!isLoading && alerts?.length === 0 && (
        <p className="flex items-center gap-2 text-sm text-ink-muted">
          <CheckCircle2 size={15} className="shrink-0 text-success" aria-hidden />
          {t("empty")}
        </p>
      )}

      <ul className="space-y-2">
        {alerts?.slice(0, 4).map((alert) => {
          const style = STYLE[alert.severity];
          return (
            <li key={alert.id} className={`rounded-r-lg border-l-[3px] ${style.border} bg-surface-2 p-3`}>
              <p className="text-sm font-medium text-ink">{alert.project.name}</p>
              <p className="mt-0.5 text-xs text-ink-muted">
                <AlertMessage alert={alert} />
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${style.badge}`}>
                  {t(`badge.${alert.severity}`)}
                </span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleResolve(alert.id)}
                    disabled={resolve.isPending && resolve.variables === alert.id}
                    className="text-xs text-accent hover:underline disabled:opacity-50"
                  >
                    {resolve.isPending && resolve.variables === alert.id ? t("resolving") : t("resolve")}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
