import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { expenseInclude } from "./expense.repository";
import { fundTransferInclude } from "./fund-transfer.repository";

/** Read-only aggregations behind the finance screens. */
export const financeRepository = {
  projects(responsibleId?: string) {
    return prisma.project.findMany({
      where: { ...(responsibleId && { responsibleId }) },
      select: {
        id: true,
        name: true,
        status: true,
        budget: true,
        progressPercentage: true,
        estimatedEndDate: true,
      },
      orderBy: { name: "asc" },
    });
  },

  approvedByProject(projectIds: string[]) {
    return prisma.expense.groupBy({
      by: ["projectId"],
      where: { projectId: { in: projectIds }, status: "APPROVED" },
      _sum: { amount: true },
    });
  },

  pendingTotals(projectIds: string[]) {
    return prisma.expense.aggregate({
      where: { projectId: { in: projectIds }, status: "PENDING" },
      _sum: { amount: true },
      _count: { _all: true },
    });
  },

  /** Suppliers with at least one APPROVED purchase in the requester's projects. */
  activeSuppliers(projectIds: string[]) {
    return prisma.expense.groupBy({
      by: ["supplierId"],
      where: { projectId: { in: projectIds }, status: "APPROVED", supplierId: { not: null } },
    });
  },

  recentExpenses(projectIds: string[], take: number) {
    return prisma.expense.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take,
      include: expenseInclude,
    });
  },

  financialAlerts(projectIds: string[]) {
    return prisma.alert.findMany({
      where: { projectId: { in: projectIds }, type: "FINANCIAL", status: "ACTIVE" },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      include: { project: { select: { id: true, name: true } } },
    });
  },

  /** Minimal rows to bucket by month in memory (date, amount, category only). */
  approvedExpenseRows(where: Prisma.ExpenseWhereInput) {
    return prisma.expense.findMany({
      where: { ...where, status: "APPROVED" },
      select: { date: true, amount: true, category: true },
    });
  },

  transferRows(where: Prisma.FundTransferWhereInput) {
    return prisma.fundTransfer.findMany({ where, select: { date: true, amount: true } });
  },

  ledgerExpenses(where: Prisma.ExpenseWhereInput, take: number) {
    return Promise.all([
      prisma.expense.findMany({
        where: { ...where, status: "APPROVED" },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take,
        include: expenseInclude,
      }),
      prisma.expense.count({ where: { ...where, status: "APPROVED" } }),
    ]);
  },

  ledgerTransfers(where: Prisma.FundTransferWhereInput, take: number) {
    return Promise.all([
      prisma.fundTransfer.findMany({
        where,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take,
        include: fundTransferInclude,
      }),
      prisma.fundTransfer.count({ where }),
    ]);
  },

  /** Expenses paid from residents' funds (registered by a resident), not REJECTED. */
  residentFundedSpend(where: Prisma.ExpenseWhereInput) {
    return prisma.expense.aggregate({
      where: {
        ...where,
        status: { in: ["PENDING", "APPROVED"] },
        registeredBy: { role: "RESIDENT_ENGINEER" },
      },
      _sum: { amount: true },
    });
  },
};
