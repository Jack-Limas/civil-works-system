import { prisma } from "../config/prisma";
import { CreateExpenseInput } from "../schemas/expense.schema";

export const expenseRepository = {
  findMany(filters: { projectId: string; skip: number; take: number }) {
    return Promise.all([
      prisma.expense.findMany({
        where: { projectId: filters.projectId },
        skip: filters.skip,
        take: filters.take,
        orderBy: { date: "desc" },
      }),
      prisma.expense.count({ where: { projectId: filters.projectId } }),
    ]);
  },

  sumByProject(projectId: string) {
    return prisma.expense.aggregate({
      where: { projectId },
      _sum: { amount: true },
    });
  },

  create(data: CreateExpenseInput) {
    return prisma.expense.create({ data });
  },
};