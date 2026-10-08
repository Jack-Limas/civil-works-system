import { prisma } from "../config/prisma";

/** Every aggregate accepts an optional responsibleId to scope it to a resident's projects. */
export const dashboardRepository = {
  countProjectsByStatus(responsibleId?: string) {
    return prisma.project.groupBy({
      by: ["status"],
      where: { ...(responsibleId && { responsibleId }) },
      _count: true,
    });
  },

  averageProgress(responsibleId?: string) {
    return prisma.project.aggregate({
      where: { ...(responsibleId && { responsibleId }) },
      _avg: { progressPercentage: true },
    });
  },

  totalBudget(responsibleId?: string) {
    return prisma.project.aggregate({
      where: { ...(responsibleId && { responsibleId }) },
      _sum: { budget: true },
    });
  },

  totalExecutedExpenses(responsibleId?: string) {
    return prisma.expense.aggregate({
      where: { status: "APPROVED", ...(responsibleId && { project: { responsibleId } }) },
      _sum: { amount: true },
    });
  },

  recentActivities(take: number, responsibleId?: string) {
    return prisma.activity.findMany({
      take,
      where: { ...(responsibleId && { project: { responsibleId } }) },
      orderBy: { date: "desc" },
      include: { project: { select: { name: true } } },
    });
  },
};
