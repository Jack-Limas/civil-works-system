"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useTranslations } from "next-intl";
import { dashboardService } from "@/lib/dashboard-service";
import { DashboardSummary } from "@/types/dashboard";
import { KpiCard } from "@/components/ui/kpi-card";
import { BudgetChart } from "@/components/charts/budget-chart";
import { AnalysisRunner } from "@/components/dashboard/analysis-runner";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isLoadingAuth = useAuthStore((s) => s.isLoading);
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);

  useEffect(() => {
    dashboardService
      .getSummary()
      .then(setSummary)
      .catch(() => setError("No se pudo cargar el resumen del dashboard"))
      .finally(() => setIsLoadingSummary(false));
  }, []);

  if (isLoadingAuth || isLoadingSummary) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400 animate-pulse">
          {tCommon("loading")}
        </p>
      </div>
    );
  }

  // Nombre formateado respetando roles e i18n
  const displayName =
    user?.name || (user?.role === "ADMIN" ? "Administrador" : "Usuario");

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">
          {t("welcome", { name: displayName })} 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {t("role")}: {user?.role ?? "N/A"}
        </p>
      </div>

      {error && <p className="text-red-500 font-medium">{error}</p>}

      {summary && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <KpiCard label="Obras activas" value={summary.projects.inProgress} />
            <KpiCard label="Obras finalizadas" value={summary.projects.finished} />
            <KpiCard label="Avance promedio" value={`${summary.averageProgress}%`} />
            <KpiCard
              label="Alertas activas"
              value={summary.activeAlertsCount}
              hint={`${summary.projects.withActiveAlerts} obra(s) afectada(s)`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-2 font-medium">Presupuesto vs Ejecutado</h2>
              <BudgetChart total={summary.budget.total} executed={summary.budget.executed} />
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-2 font-medium">Materiales con stock bajo</h2>
              {summary.lowStockMaterials.length === 0 ? (
                <p className="text-sm text-gray-500">Sin materiales en riesgo.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {summary.lowStockMaterials.map((m) => (
                    <li key={m.id} className="flex justify-between">
                      <span>{m.name}</span>
                      <span className="text-red-500 font-semibold">
                        {m.stockAvailable}/{m.stockMinimum}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      <AnalysisRunner />
    </div>
  );
}