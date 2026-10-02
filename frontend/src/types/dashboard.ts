export interface DashboardSummary {
  projects: {
    planned: number;
    inProgress: number;
    suspended: number;
    finished: number;
    total: number;
    withActiveAlerts: number;
  };
  averageProgress: number;
  budget: { total: number; executed: number };
  lowStockMaterialsCount: number;
  lowStockMaterials: Array<{ id: string; name: string; stockAvailable: number; stockMinimum: number }>;
  activeAlertsCount: number;
}