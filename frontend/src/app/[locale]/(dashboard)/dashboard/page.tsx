"use client";

import { useEffect, useState } from "react";
import { Building2, Clock, Users2, Gauge } from "lucide-react";
import { dashboardService } from "@/lib/dashboard-service";
import { DashboardSummary } from "@/types/dashboard";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { ProjectsTimeline } from "@/components/dashboard/projects-timeline";
import { CriticalAlertsWidget } from "@/components/dashboard/critical-alerts-widget";
import { UpcomingMilestonesWidget } from "@/components/dashboard/upcoming-milestones-widget";
import { FieldActivityFeed } from "@/components/dashboard/field-activity-feed";
import { FloatingAIWidget } from "@/components/dashboard/floating-ai-widget";
import { AnalysisRunner } from "@/components/dashboard/analysis-runner";
import { SharedMemoryDemo } from "@/components/dashboard/shared-memory-demo";
import { useSharedAnalysisStatus } from "@/hooks/use-shared-analysis-status";

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);

  // Escuchamos el estado global compartido entre pestañas vía SharedWorker (Paso 24)
  const { status: sharedStatus } = useSharedAnalysisStatus();

  useEffect(() => {
    dashboardService
      .getSummary()
      .then(setSummary)
      .finally(() => setIsLoadingSummary(false));
  }, []);

  return (
    <>
      {/* Encabezado dinámico con barra de búsqueda y controles */}
      <DashboardHeader
        title="Dashboard Principal"
        subtitle="Resumen operativo y estado general de las obras."
      />

      <main className="flex-1 space-y-5 p-6">
        {/* Indicador animado de sincronización multitabla (Paso 24.1) */}
        {sharedStatus.status === "running" && (
          <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-xs font-medium text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-indigo-500"></span>
            </span>
            🔄 Sincronizado vía SharedWorker: {sharedStatus.stage}
          </div>
        )}

        {/* Tarjetas KPI Superiores en cascada */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            index={0}
            label="Obras Activas"
            value={summary?.projects.inProgress ?? (isLoadingSummary ? "..." : 0)}
            icon={Building2}
            iconColor="accent"
            trend={`${summary?.projects.total ?? 0} en total`}
            trendPositive
          />
          <KpiCard
            index={1}
            label="Avance Promedio"
            value={`${summary?.averageProgress ?? 0}%`}
            icon={Gauge}
            iconColor="success"
            trend="Cumplimiento de hitos"
            trendPositive
          />
          <KpiCard
            index={2}
            label="Alertas Activas"
            value={summary?.activeAlertsCount ?? 0}
            icon={Clock}
            iconColor="critical"
            trend={`${summary?.projects.withActiveAlerts ?? 0} obra(s) afectada(s)`}
          />
          <KpiCard
            index={3}
            label="Materiales en Riesgo"
            value={summary?.lowStockMaterialsCount ?? summary?.lowStockMaterials?.length ?? 0}
            icon={Users2}
            iconColor="brand"
            trend="Stock bajo mínimo"
          />
        </div>

        {/* Layout Principal de 2 columnas (Figma Prototype) */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Columna Izquierda (Ancha): Cronograma/Avance + Actividad en Campo */}
          <div className="space-y-5 lg:col-span-2">
            <ProjectsTimeline />
            <FieldActivityFeed />
          </div>

          {/* Columna Derecha (Lateral): Alertas Críticas + Próximos Hitos */}
          <div className="space-y-5">
            <CriticalAlertsWidget />
            <UpcomingMilestonesWidget />
          </div>
        </div>

        {/* Componentes de pruebas técnicas de concurrencia y Workers */}
        <div className="mt-8 space-y-5 border-t border-line pt-6">
          <AnalysisRunner />
          <SharedMemoryDemo />
        </div>
      </main>

      {/* Widget flotante para la IA / Análisis rápido */}
      <FloatingAIWidget />
    </>
  );
}