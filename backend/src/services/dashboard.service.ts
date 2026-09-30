import { dashboardRepository } from "../repositories/dashboard.repository";
import { materialService } from "./material.service";
import { alertRepository } from "../repositories/alert.repository";

export const dashboardService = {
  async getGeneralSummary() {
    const [statusCounts, avgProgress, totalBudget, totalExpenses, lowStockMaterials, activeAlerts, alertsByProject] =
      await Promise.all([
        dashboardRepository.countProjectsByStatus(),
        dashboardRepository.averageProgress(),
        dashboardRepository.totalBudget(),
        dashboardRepository.totalExecutedExpenses(),
        materialService.getLowStockMaterials(),
        alertRepository.countActive(),
        alertRepository.countActiveByProject(),
      ]);

    const statusMap: Record<string, number> = {};
    for (const row of statusCounts) statusMap[row.status] = row._count;

    return {
      projects: {
        planned: statusMap.PLANNED ?? 0,
        inProgress: statusMap.IN_PROGRESS ?? 0,
        suspended: statusMap.SUSPENDED ?? 0,
        finished: statusMap.FINISHED ?? 0,
        total: Object.values(statusMap).reduce((a, b) => a + b, 0),
        withActiveAlerts: alertsByProject.length,
      },
      averageProgress: Number((avgProgress._avg.progressPercentage ?? 0).toFixed(2)),
      budget: {
        total: Number(totalBudget._sum.budget ?? 0),
        executed: Number(totalExpenses._sum.amount ?? 0),
      },
      lowStockMaterialsCount: lowStockMaterials.length,
      lowStockMaterials,
      activeAlertsCount: activeAlerts,
    };
  },

  async getRecentActivity(take = 10) {
    return dashboardRepository.recentActivities(take);
  },
};