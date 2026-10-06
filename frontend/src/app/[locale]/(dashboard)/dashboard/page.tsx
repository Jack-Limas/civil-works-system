"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useTranslations } from "next-intl";
import { dashboardService } from "@/lib/dashboard-service";
import { DashboardSummary } from "@/types/dashboard";
import { KpiCard } from "@/components/ui/kpi-card";
import { BudgetChart } from "@/components/charts/budget-chart";
import { AnalysisRunner } from "@/components/dashboard/analysis-runner";
import { SharedMemoryDemo } from "@/components/dashboard/shared-memory-demo";
import { useSharedAnalysisStatus } from "@/hooks/use-shared-analysis-status";

// Importamos los iconos para las tarjetas KPI rediseñadas
import { Building2, CheckCircle2, TrendingUp, AlertTriangle } from "lucide-react";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isLoadingAuth = useAuthStore((s) => s.isLoading);
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);

  // Escuchamos el estado global compartido entre pestañas vía SharedWorker
  const { status: sharedStatus } = useSharedAnalysisStatus();

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
          {/* Tarjetas KPI con animación orquestada e iconos estilizados */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <KpiCard
              label="Obras activas"
              value={summary.projects.inProgress}
              icon={Building2}
              iconColor="brand"
              trend="En ejecución activa"
              trendPositive={true}
              index={0}
            />
            <KpiCard
              label="Obras finalizadas"
              value={summary.projects.finished}
              icon={CheckCircle2}
              iconColor="success"
              trend="Entregadas con éxito"
              trendPositive={true}
              index={1}
            />
            <KpiCard
              label="Avance promedio"
              value={`${summary.averageProgress}%`}
              icon={TrendingUp}
              iconColor="accent"
              trend="Cumplimiento global"
              trendPositive={true}
              index={2}
            />
            <KpiCard
              label="Alertas activas"
              value={summary.activeAlertsCount}
              icon={AlertTriangle}
              iconColor="critical"
              trend={`${summary.projects.withActiveAlerts} obra(s) afectada(s)`}
              trendPositive={false}
              index={3}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-line bg-surface p-4">
              <h2 className="mb-2 font-medium">Presupuesto vs Ejecutado</h2>
              <BudgetChart total={summary.budget.total} executed={summary.budget.executed} />
            </div>
            <div className="rounded-xl border border-line bg-surface p-4">
              <h2 className="mb-2 font-medium">Materiales con stock bajo</h2>
              {summary.lowStockMaterials.length === 0 ? (
                <p className="text-sm text-ink-muted">Sin materiales en riesgo.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {summary.lowStockMaterials.map((m) => (
                    <li key={m.id} className="flex justify-between">
                      <span>{m.name}</span>
                      <span className="text-critical font-semibold">
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

      {/* Indicador animado de sincronización entre pestañas (Paso 24.1) */}
      {sharedStatus.status === "running" && (
        <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-xs font-medium text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-indigo-500"></span>
          </span>
          🔄 Sincronizado vía SharedWorker: {sharedStatus.stage}
        </div>
      )}

      <AnalysisRunner />

      {/* Demostración de SharedArrayBuffer y aislamiento Cross-Origin (Paso 24.2) */}
      <SharedMemoryDemo />
    </div>
  );
}