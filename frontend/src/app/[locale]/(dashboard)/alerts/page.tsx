"use client";

import { useAlerts, useGenerateAlerts, useResolveAlert, Alert } from "@/lib/alerts-service";

const SEVERITY_COLOR: Record<Alert["severity"], string> = {
  HIGH: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  MEDIUM: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  LOW: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

export default function AlertsPage() {
  const { data: alerts, isLoading } = useAlerts("ACTIVE");
  const generate = useGenerateAlerts();
  const resolve = useResolveAlert();

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alertas del Sistema</h1>
          <p className="text-sm text-gray-500">Alertas automáticas generadas por el motor de reglas</p>
        </div>
        <button
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
        >
          {generate.isPending ? "Analizando..." : "Generar análisis"}
        </button>
      </div>

      {isLoading && <p className="text-sm text-gray-500 animate-pulse">Cargando alertas...</p>}

      {!isLoading && alerts?.length === 0 && (
        <div className="rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-500 dark:border-gray-800">
          No hay alertas activas en este momento.
        </div>
      )}

      <div className="space-y-2">
        {alerts?.map((alert) => (
          <div
            key={alert.id}
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
          >
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_COLOR[alert.severity]}`}>
                  {alert.severity}
                </span>
                <span className="text-xs text-gray-400">{alert.type}</span>
                <span className="text-xs text-gray-400">· {alert.project?.name ?? "Obra"}</span>
              </div>
              <p className="text-sm">{alert.message}</p>
            </div>
            <button
              onClick={() => resolve.mutate(alert.id)}
              disabled={resolve.isPending}
              className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Resolver
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}