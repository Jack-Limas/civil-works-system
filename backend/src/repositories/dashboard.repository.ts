import { prisma } from "../config/prisma";

export const dashboardRepository = {
  countProjectsByStatus() {
    return prisma.project.groupBy({ by: ["status"], _count: true });
  },

  averageProgress() {
    return prisma.project.aggregate({ _avg: { progressPercentage: true } });
  },

  totalBudget() {
    return prisma.project.aggregate({ _sum: { budget: true } });
  },

  totalExecutedExpenses() {
    return prisma.expense.aggregate({ _sum: { amount: true } });
  },

  recentActivities(take: number) {
    return prisma.activity.findMany({
      take,
      orderBy: { date: "desc" },
      include: { project: { select: { name: true } } },
    });
  },
};