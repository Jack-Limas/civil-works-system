import { Prisma } from "@prisma/client";
import { prisma, STOCK_TX_OPTIONS } from "../config/prisma";
import { materialRepository } from "../repositories/material.repository";
import { inventoryMovementRepository } from "../repositories/inventory-movement.repository";
import { expenseRepository } from "../repositories/expense.repository";
import { projectRepository } from "../repositories/project.repository";
import { supplierRepository } from "../repositories/supplier.repository";
import { CreateExpenseInput, ListExpensesQuery, ReviewExpenseInput } from "../schemas/expense.schema";
import { AppError } from "../utils/app-error";
import { uploadBuffer } from "../utils/cloud-storage";
import { RequestUser } from "../types/auth";
import { projectAccess } from "./project-access.service";
import { audit, AUDIT_ACTIONS } from "./audit.service";

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

    const { inventoryEntry, ...expenseData } = data;
    if (inventoryEntry) {
      if (expenseData.category !== "MATERIALS") {
        throw new AppError(400, "An inventory entry can only accompany a MATERIALS expense");
      }
      if (!(await materialRepository.findById(inventoryEntry.materialId))) {
        throw new AppError(404, "Material not found");
      }
    }

    const supportUrl = support ? await uploadBuffer(support.buffer, "civil-works-expense-support") : undefined;
    const isAdmin = projectAccess.isAdmin(requester);
    const record: Prisma.ExpenseUncheckedCreateInput = {
      ...expenseData,
      supportUrl,
      registeredById: requester.sub,
      status: isAdmin ? "APPROVED" : "PENDING",
      ...(isAdmin && { reviewedById: requester.sub, reviewedAt: new Date() }),
    };

    // Expense, optional stock IN and its audit event in one transaction: all or nothing
    const expenseId = await prisma.$transaction(async (tx) => {
      const expense = await expenseRepository.create(record, tx);
      await audit.record(
        tx,
        {
          action: AUDIT_ACTIONS.expenseCreated,
          entityType: "expense",
          entityId: expense.id,
          metadata: { projectId: expense.projectId, amount: expense.amount, category: expense.category, status: expense.status },
        },
        audit.context(requester)
      );
      if (!inventoryEntry) return expense.id;

      const unitCost = inventoryEntry.unitCost ?? expenseData.amount / inventoryEntry.quantity;
      await inventoryMovementRepository.registerAtomic(
        {
          materialId: inventoryEntry.materialId,
          type: "IN",
          quantity: inventoryEntry.quantity,
          projectId: expense.projectId,
          expenseId: expense.id,
          supplierId: expense.supplierId,
          unitCost: Math.round(unitCost * 100) / 100,
          date: expense.date,
          notes: expense.description,
          registeredById: requester.sub,
        },
        tx
      );
      await audit.record(
        tx,
        {
          action: AUDIT_ACTIONS.movementRegistered,
          entityType: "material",
          entityId: inventoryEntry.materialId,
          metadata: { type: "IN", quantity: inventoryEntry.quantity, projectId: expense.projectId, expenseId: expense.id },
        },
        audit.context(requester)
      );
      return expense.id;
    }, STOCK_TX_OPTIONS);
    return (await expenseRepository.findById(expenseId))!;
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

    await audit.log(
      {
        action: input.decision === "APPROVE" ? AUDIT_ACTIONS.expenseApproved : AUDIT_ACTIONS.expenseRejected,
        entityType: "expense",
        entityId: id,
        metadata: {
          projectId: existing.projectId,
          amount: existing.amount,
          category: existing.category,
          ...(input.decision === "REJECT" && { rejectionReason: input.reason ?? null }),
        },
      },
      audit.context(requester)
    );
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
