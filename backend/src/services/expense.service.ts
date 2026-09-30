import { expenseRepository } from "../repositories/expense.repository";
import { projectRepository } from "../repositories/project.repository";
import { CreateExpenseInput, ListExpensesQuery } from "../schemas/expense.schema";
import { AppError } from "../utils/app-error";

export const expenseService = {
  async list(query: ListExpensesQuery) {
    const skip = (query.page - 1) * query.limit;
    const [expenses, total] = await expenseRepository.findMany({
      projectId: query.projectId,
      skip,
      take: query.limit,
    });

    return {
      data: expenses,
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  },

  async create(data: CreateExpenseInput) {
    const project = await projectRepository.findById(data.projectId);
    if (!project) throw new AppError(404, "Project not found");

    return expenseRepository.create(data);
  },

  async getBudgetIndicators(projectId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) throw new AppError(404, "Project not found");

    const { _sum } = await expenseRepository.sumByProject(projectId);
    const executedExpenses = Number(_sum.amount ?? 0);
    const budget = Number(project.budget);

    const availableBudget = budget - executedExpenses;
    const executedPercentage = budget > 0 ? (executedExpenses / budget) * 100 : 0;

    return {
      budget,
      executedExpenses,
      availableBudget,
      executedPercentage: Number(executedPercentage.toFixed(2)),
      physicalProgress: project.progressPercentage,
      // Señal temprana para el módulo de alertas del Paso 16:
      // si el gasto avanza más rápido que la obra física, hay riesgo de sobrecosto.
      financialVsPhysicalGap: Number((executedPercentage - project.progressPercentage).toFixed(2)),
    };
  },
};