import { Prisma } from "@prisma/client";
import { expenseRepository } from "../repositories/expense.repository";
import { projectRepository } from "../repositories/project.repository";
import { supplierRepository } from "../repositories/supplier.repository";
import { CreateExpenseInput, ListExpensesQuery, ReviewExpenseInput } from "../schemas/expense.schema";
import { AppError } from "../utils/app-error";
import { uploadBuffer } from "../utils/cloud-storage";
import { RequestUser } from "../types/auth";
import { projectAccess } from "./project-access.service";

export interface SupportFile {
  buffer: Buffer;
  mimetype: string;
}

export const expenseService = {
  /** Filtered, paginated list. Residents only ever see expenses of their own projects. */
  async list(query: ListExpensesQuery, requester: RequestUser) {
    if (query.projectId) await projectAccess.assert(requester, query.projectId);

    const responsibleId = projectAccess.scope(requester);
    const where: Prisma.ExpenseWhereInput = {
      ...(query.projectId && { projectId: query.projectId }),
      ...(query.status && { status: query.status }),
      ...(query.category && { category: query.category }),
      ...(query.supplierId && { supplierId: query.supplierId }),
      ...(query.registeredById && { registeredById: query.registeredById }),
      ...((query.from || query.to) && { date: { ...(query.from && { gte: query.from }), ...(query.to && { lte: query.to }) } }),
      ...(responsibleId && { project: { responsibleId } }),
    };

    const skip = (query.page - 1) * query.limit;
    const [expenses, total] = await expenseRepository.findMany(where, skip, query.limit);

    return {
      data: expenses,
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  },

  /**
   * - RESIDENT_ENGINEER: the expense is paid from their field fund and starts
   *   PENDING until an admin reviews it.
   * - ADMIN: a direct company payment, APPROVED immediately (never touches a
   *   resident's balance because registeredById is the admin).
   * registeredById always comes from the session, never from the body.
   */
  async create(data: CreateExpenseInput, support: SupportFile | null, requester: RequestUser) {
    await projectAccess.assert(requester, data.projectId);

    if (data.supplierId && !(await supplierRepository.findById(data.supplierId))) {
      throw new AppError(404, "Supplier not found");
    }

    const supportUrl = support ? await uploadBuffer(support.buffer, "civil-works-expense-support") : undefined;
    const isAdmin = projectAccess.isAdmin(requester);

    return expenseRepository.create({
      ...data,
      supportUrl,
      registeredById: requester.sub,
      status: isAdmin ? "APPROVED" : "PENDING",
      ...(isAdmin && { reviewedById: requester.sub, reviewedAt: new Date() }),
    });
  },

  /** Admin decision on a PENDING expense. Returns the updated expense. */
  async review(id: string, input: ReviewExpenseInput, requester: RequestUser) {
    const existing = await expenseRepository.findById(id);
    if (!existing) throw new AppError(404, "Expense not found");
    if (existing.status !== "PENDING") throw new AppError(409, "Only pending expenses can be reviewed");

    const updated = await expenseRepository.reviewIfPending(id, {
      status: input.decision === "APPROVE" ? "APPROVED" : "REJECTED",
      reviewedById: requester.sub,
      rejectionReason: input.decision === "REJECT" ? (input.reason ?? null) : null,
    });
    if (updated === 0) throw new AppError(409, "Only pending expenses can be reviewed");

    return (await expenseRepository.findById(id))!;
  },

  async getBudgetIndicators(projectId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) throw new AppError(404, "Project not found");

    const { _sum } = await expenseRepository.sumApprovedByProject(projectId);
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
      // Early signal for the alert engine: spend growing faster than physical progress
      financialVsPhysicalGap: Number((executedPercentage - project.progressPercentage).toFixed(2)),
    };
  },
};
