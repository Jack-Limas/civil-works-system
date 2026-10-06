"use client";

import { useAlerts, useResolveAlert } from "@/lib/alerts-service";
import { AlertTriangle } from "lucide-react";

const STYLE = {
  HIGH: { border: "border-l-critical", badge: "bg-critical text-white", label: "ACCIÓN REQUERIDA" },
  MEDIUM: { border: "border-l-warning", badge: "bg-warning text-white", label: "REVISAR" },
  LOW: { border: "border-l-line", badge: "bg-surface-2 text-ink-muted", label: "INFORMATIVO" },
};

export function CriticalAlertsWidget() {
  const { data: alerts, isLoading } = useAlerts("ACTIVE");
  const resolve = useResolveAlert();

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle size={16} className="text-critical" />
        <h2 className="text-sm font-semibold">Alertas Importantes</h2>
        {alerts && alerts.length > 0 && (
          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-critical px-1 text-xs text-white">
            {alerts.length}
          </span>
        )}
      </div>

      {isLoading && <p className="text-sm text-ink-muted">Cargando...</p>}
      {!isLoading && alerts?.length === 0 && <p className="text-sm text-ink-muted">Sin alertas activas.</p>}

      <div className="space-y-2">
        {alerts?.slice(0, 4).map((alert) => {
          const style = STYLE[alert.severity];
          return (
            <div key={alert.id} className={`border-l-[3px] ${style.border} rounded-r-lg bg-surface-2 p-3`}>
              <p className="text-sm font-medium">{alert.project.name}</p>
              <p className="mt-0.5 text-xs text-ink-muted">{alert.message}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${style.badge}`}>
                  {style.label}
                </span>
                <button
                  onClick={() => resolve.mutate(alert.id)}
                  className="text-xs text-accent hover:underline"
                >
                  Resolver
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}