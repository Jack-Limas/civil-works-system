import { ExpenseCategory, Prisma } from "@prisma/client";
import { financeRepository } from "../repositories/finance.repository";
import { CashflowQuery } from "../schemas/finance.schema";
import { RequestUser } from "../types/auth";
import { projectAccess } from "./project-access.service";

const MS_PER_DAY = 86_400_000;
const CATEGORIES: ExpenseCategory[] = ["MATERIALS", "LABOR", "EQUIPMENT", "TRANSPORT", "FUEL", "OTHER"];

/**
 * Cost Performance Index: earned value (budget x physical progress) divided by
 * actual (APPROVED) cost. > 1 means the work done is worth more than what it
 * cost. Undefined when nothing has been spent yet.
 */
function cpi(earnedValue: number, actualCost: number): number | null {
  return actualCost > 0 ? Math.round((earnedValue / actualCost) * 100) / 100 : null;
}

const monthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

export const financeService = {
  async summary(requester: RequestUser) {
    const projects = await financeRepository.projects(projectAccess.scope(requester));
    const ids = projects.map((p) => p.id);

    const [approved, pending, suppliers, recentExpenses, financialAlerts] = await Promise.all([
      financeRepository.approvedByProject(ids),
      financeRepository.pendingTotals(ids),
      financeRepository.activeSuppliers(ids),
      financeRepository.recentExpenses(ids, 6),
      financeRepository.financialAlerts(ids),
    ]);
    const spentByProject = new Map(approved.map((r) => [r.projectId, Number(r._sum.amount ?? 0)]));

    const now = Date.now();
    let totalBudget = 0;
    let approvedSpent = 0;
    let earnedValue = 0;
    let nextMilestone: { projectId: string; name: string; date: Date; days: number } | null = null;

    const byProject = projects.map((p) => {
      const budget = Number(p.budget);
      const spent = spentByProject.get(p.id) ?? 0;
      const earned = (budget * p.progressPercentage) / 100;
      totalBudget += budget;
      approvedSpent += spent;
      earnedValue += earned;

      const isOpen = p.status === "PLANNED" || p.status === "IN_PROGRESS";
      const days = Math.ceil((p.estimatedEndDate.getTime() - now) / MS_PER_DAY);
      if (isOpen && days >= 0 && (!nextMilestone || days < nextMilestone.days)) {
        nextMilestone = { projectId: p.id, name: p.name, date: p.estimatedEndDate, days };
      }

      return {
        projectId: p.id,
        name: p.name,
        status: p.status,
        budget,
        approvedSpent: spent,
        physicalProgress: p.progressPercentage,
        financialProgress: budget > 0 ? Math.round((spent / budget) * 1000) / 10 : 0,
        cpi: cpi(earned, spent),
      };
    });

    return {
      totalBudget,
      approvedSpent,
      available: totalBudget - approvedSpent,
      pendingApproval: { amount: Number(pending._sum.amount ?? 0), count: pending._count._all },
      cpi: cpi(earnedValue, approvedSpent),
      activeSuppliers: suppliers.length,
      nextMilestone,
      projects: byProject,
      recentExpenses,
      financialAlerts,
    };
  },

  /**
   * Monthly series of fund transfers vs APPROVED expenses (by category) plus a
   * paginated ledger mixing both. Residents only see their projects' expenses
   * and the transfers they received.
   */
  async cashflow(query: CashflowQuery, requester: RequestUser) {
    if (query.projectId) await projectAccess.assert(requester, query.projectId);

    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (query.months - 1), 1));
    const responsibleId = projectAccess.scope(requester);

    const expenseWhere: Prisma.ExpenseWhereInput = {
      date: { gte: start },
      ...(query.projectId && { projectId: query.projectId }),
      ...(query.supplierId && { supplierId: query.supplierId }),
      ...(responsibleId && { project: { responsibleId } }),
    };
    // Transfers have no supplier: filtering by supplier leaves only expenses
    const transferWhere: Prisma.FundTransferWhereInput = query.supplierId
      ? { id: { in: [] } }
      : {
          date: { gte: start },
          ...(query.projectId && { projectId: query.projectId }),
          ...(requester.role !== "ADMIN" && { residentId: requester.sub }),
        };

    const take = query.page * query.limit;
    const [expenseRows, transferRows, [ledgerExpenses, expenseCount], [ledgerTransfers, transferCount], residentSpend] =
      await Promise.all([
        financeRepository.approvedExpenseRows(expenseWhere),
        financeRepository.transferRows(transferWhere),
        financeRepository.ledgerExpenses(expenseWhere, take),
        financeRepository.ledgerTransfers(transferWhere, take),
        financeRepository.residentFundedSpend(expenseWhere),
      ]);

    // One bucket per month, keyed "YYYY-MM" (Map keeps insertion = chronological order)
    const buckets = new Map<string, { month: string; transfers: number; expenses: number; byCategory: Record<ExpenseCategory, number> }>();
    for (let i = 0; i < query.months; i++) {
      const key = monthKey(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1)));
      buckets.set(key, {
        month: key,
        transfers: 0,
        expenses: 0,
        byCategory: Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<ExpenseCategory, number>,
      });
    }
    for (const row of expenseRows) {
      const bucket = buckets.get(monthKey(row.date));
      if (!bucket) continue;
      const amount = Number(row.amount);
      bucket.expenses += amount;
      bucket.byCategory[row.category] += amount;
    }
    for (const row of transferRows) {
      const bucket = buckets.get(monthKey(row.date));
      if (bucket) bucket.transfers += Number(row.amount);
    }

    const ledger = [
      ...ledgerExpenses.map((e) => ({
        kind: "EXPENSE" as const,
        id: e.id,
        date: e.date,
        amount: Number(e.amount),
        description: e.description,
        category: e.category,
        project: e.project,
        supplier: e.supplier,
        person: e.registeredBy,
        method: e.paymentMethod,
        supportUrl: e.supportUrl,
      })),
      ...ledgerTransfers.map((t) => ({
        kind: "TRANSFER" as const,
        id: t.id,
        date: t.date,
        amount: Number(t.amount),
        description: t.notes,
        category: null,
        project: t.project,
        supplier: null,
        person: t.resident,
        method: t.method,
        supportUrl: null,
      })),
    ]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice((query.page - 1) * query.limit, query.page * query.limit);

    const series = [...buckets.values()];
    const totalTransfers = series.reduce((s, b) => s + b.transfers, 0);
    const totalExpenses = series.reduce((s, b) => s + b.expenses, 0);
    const total = expenseCount + transferCount;

    return {
      from: start,
      series,
      totals: {
        transfers: totalTransfers,
        approvedExpenses: totalExpenses,
        // Money sent to residents in the window not yet justified with their expenses
        toBeAccounted: totalTransfers - Number(residentSpend._sum.amount ?? 0),
      },
      ledger: {
        data: ledger,
        pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
      },
    };
  },
};
