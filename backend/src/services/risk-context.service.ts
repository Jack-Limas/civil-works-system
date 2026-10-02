import { projectRepository } from "../repositories/project.repository";
import { expenseService } from "./expense.service";
import { materialService } from "./material.service";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/app-error";
import { ProjectRiskContext } from "../strategies/risk/risk-strategy.interface";

function calculateExpectedProgress(startDate: Date, endDate: Date): number {
  const now = Date.now();
  const start = startDate.getTime();
  const end = endDate.getTime();

  if (now <= start) return 0;
  if (now >= end) return 100;

  return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
}

export const riskContextService = {
  async build(projectId: string): Promise<ProjectRiskContext> {
    const project = await projectRepository.findById(projectId);
    if (!project) throw new AppError(404, "Project not found");

    const [financial, openIncidents, lowStockMaterials] = await Promise.all([
      expenseService.getBudgetIndicators(projectId),
      prisma.incident.findMany({
        where: { projectId, status: { in: ["OPEN", "IN_REVIEW"] } },
        select: { type: true, priority: true },
      }),
      materialService.getLowStockMaterials(),
    ]);

    return {
      project: {
        id: project.id,
        name: project.name,
        budget: Number(project.budget),
        progressPercentage: project.progressPercentage,
        expectedProgress: calculateExpectedProgress(project.startDate, project.estimatedEndDate),
        startDate: project.startDate,
        estimatedEndDate: project.estimatedEndDate,
      },
      financial: {
        executedExpenses: financial.executedExpenses,
        executedPercentage: financial.executedPercentage,
        availableBudget: financial.availableBudget,
        financialVsPhysicalGap: financial.financialVsPhysicalGap,
      },
      openIncidents,
      lowStockMaterialsCount: lowStockMaterials.length,
    };
  },
};