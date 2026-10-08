"use client";

import { useFormatter, useTranslations } from "next-intl";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Reveal, RevealItem } from "@/components/ui/reveal";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui/form";
import { AlertMessage } from "@/components/alerts/alert-message";
import { useAlerts, useGenerateAlerts, useResolveAlert, Alert } from "@/lib/alerts-service";
import { useAuthStore } from "@/store/auth.store";
import { useApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/store/toast.store";
import { Link } from "@/i18n/navigation";

const SEVERITY_CLASS: Record<Alert["severity"], string> = {
  HIGH: "bg-critical/15 text-critical",
  MEDIUM: "bg-warning/15 text-warning",
  LOW: "bg-surface-2 text-ink-muted",
};

const BORDER_CLASS: Record<Alert["severity"], string> = {
  HIGH: "border-l-critical",
  MEDIUM: "border-l-warning",
  LOW: "border-l-line",
};

export default function AlertsPage() {
  const t = useTranslations("alerts");
  const format = useFormatter();
  const isAdmin = useAuthStore((s) => s.user?.role === "ADMIN");
  const errorMessage = useApiErrorMessage();
  const { data: alerts, isLoading } = useAlerts("ACTIVE");
  const generate = useGenerateAlerts();
  const resolve = useResolveAlert();

  function runAnalysis() {
    generate.mutate(undefined, {
      onSuccess: (result) => {
        const created = (result.details ?? []).reduce((sum, d) => sum + d.alertsCreated, 0);
        toast.success(t("generated", { count: created }));
      },
      onError: (error) => toast.error(errorMessage(error)),
    });
  }

  return (
    <>
      <DashboardHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          isAdmin && (
            <button type="button" onClick={runAnalysis} disabled={generate.isPending} className={primaryButtonClass}>
              <RefreshCw size={15} className={generate.isPending ? "animate-spin motion-reduce:animate-none" : ""} aria-hidden />
              {generate.isPending ? t("generating") : t("generate")}
            </button>
          )
        }
      />

      <main className="p-4 sm:p-6">
        {isLoading && (
          <div className="space-y-2" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-surface motion-reduce:animate-none" />
            ))}
          </div>
        )}

        {!isLoading && alerts?.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-surface p-10 text-center">
            <CheckCircle2 size={28} className="text-success" aria-hidden />
            <p className="text-sm text-ink-muted">{t("empty")}</p>
          </div>
        )}

        <Reveal className="space-y-2">
          {alerts?.map((alert) => (
            <RevealItem key={alert.id}>
              <article
                className={`flex flex-col gap-3 rounded-xl border border-l-4 border-line ${BORDER_CLASS[alert.severity]} bg-surface p-4 sm:flex-row sm:items-center sm:justify-between`}
              >
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className={`rounded-full px-2 py-0.5 font-medium ${SEVERITY_CLASS[alert.severity]}`}>
                      {t(`severity.${alert.severity}`)}
                    </span>
                    <span className="text-ink-muted">{t(`types.${alert.type}`)}</span>
                    <span className="text-ink-muted">·</span>
                    <Link href={`/projects/${alert.project.id}`} className="font-medium text-ink hover:text-accent">
                      {alert.project.name}
                    </Link>
                    <span className="text-ink-muted">· {format.dateTime(new Date(alert.createdAt), { dateStyle: "medium" })}</span>
                  </div>
                  <p className="text-sm text-ink">
                    <AlertMessage alert={alert} />
                  </p>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() =>
                      resolve.mutate(alert.id, {
                        onSuccess: () => toast.success(t("resolved")),
                        onError: (error) => toast.error(errorMessage(error)),
                      })
                    }
                    disabled={resolve.isPending && resolve.variables === alert.id}
                    className={`${secondaryButtonClass} shrink-0`}
                  >
                    {t("resolve")}
                  </button>
                )}
              </article>
            </RevealItem>
          ))}
        </Reveal>
      </main>
    </>
  );
}
