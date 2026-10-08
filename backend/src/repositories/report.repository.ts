import { prisma } from "../config/prisma";

/** Read-only queries behind the reports. Every query receives the role-scoped project ids. */
export const reportRepository = {
  projects(projectIds: string[]) {
    return prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        municipality: true,
        budget: true,
        progressPercentage: true,
        startDate: true,
        estimatedEndDate: true,
        responsible: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    });
  },

  activitiesInRange(projectIds: string[], start: Date, end: Date) {
    return prisma.activity.findMany({
      where: { projectId: { in: projectIds }, date: { gte: start, lt: end } },
      select: { projectId: true, date: true, progressPercentage: true },
    });
  },

  /** Progress each project had right before the period (latest earlier activity). */
  lastActivityBefore(projectIds: string[], start: Date) {
    return prisma.activity.findMany({
      where: { projectId: { in: projectIds }, date: { lt: start } },
      distinct: ["projectId"],
      orderBy: [{ projectId: "asc" }, { date: "desc" }],
      select: { projectId: true, progressPercentage: true },
    });
  },

  lastActivityPerProject(projectIds: string[]) {
    return prisma.activity.findMany({
      where: { projectId: { in: projectIds } },
      distinct: ["projectId"],
      orderBy: [{ projectId: "asc" }, { date: "desc" }],
      select: { projectId: true, date: true, name: true },
    });
  },

  approvedExpensesInRange(projectIds: string[], start: Date, end: Date) {
    return prisma.expense.findMany({
      where: { projectId: { in: projectIds }, status: "APPROVED", date: { gte: start, lt: end } },
      select: { projectId: true, amount: true, category: true, date: true },
    });
  },

  totalsByProjectAndStatus(projectIds: string[]) {
    return prisma.expense.groupBy({
      by: ["projectId", "status"],
      where: { projectId: { in: projectIds }, status: { in: ["APPROVED", "PENDING"] } },
      _sum: { amount: true },
    });
  },

  transfersInRange(projectIds: string[], start: Date, end: Date) {
    return prisma.fundTransfer.aggregate({
      where: { projectId: { in: projectIds }, date: { gte: start, lt: end } },
      _sum: { amount: true },
      _count: { _all: true },
    });
  },

  movementsInRange(projectIds: string[] | null, start: Date, end: Date) {
    return prisma.inventoryMovement.findMany({
      where: { date: { gte: start, lt: end }, ...(projectIds && { projectId: { in: projectIds } }) },
      select: {
        materialId: true,
        projectId: true,
        type: true,
        quantity: true,
        date: true,
        expense: { select: { status: true } },
      },
    });
  },

  incidentsInRange(projectIds: string[], start: Date, end: Date) {
    return prisma.incident.findMany({
      where: { projectId: { in: projectIds }, date: { gte: start, lt: end } },
      orderBy: [{ date: "desc" }],
      include: { project: { select: { id: true, name: true } } },
    });
  },
};
