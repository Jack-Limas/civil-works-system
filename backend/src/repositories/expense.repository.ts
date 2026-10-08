import { ExpenseStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

/** Relations every expense response carries so the UI never shows raw ids. */
export const expenseInclude = {
  project: { select: { id: true, name: true } },
  supplier: { select: { id: true, name: true, nit: true } },
  registeredBy: { select: { id: true, name: true, role: true } },
  reviewedBy: { select: { id: true, name: true } },
  inventoryMovements: {
    select: { id: true, type: true, quantity: true, material: { select: { id: true, name: true, unit: true } } },
  },
} satisfies Prisma.ExpenseInclude;

export const expenseRepository = {
  findMany(where: Prisma.ExpenseWhereInput, skip: number, take: number) {
    return Promise.all([
      prisma.expense.findMany({
        where,
        skip,
        take,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        include: expenseInclude,
      }),
      prisma.expense.count({ where }),
    ]);
  },

  findById(id: string) {
    return prisma.expense.findUnique({ where: { id }, include: expenseInclude });
  },

  /** Executed spend: only APPROVED expenses count (PENDING/REJECTED never do). */
  sumApprovedByProject(projectId: string) {
    return prisma.expense.aggregate({
      where: { projectId, status: "APPROVED" },
      _sum: { amount: true },
    });
  },

  create(data: Prisma.ExpenseUncheckedCreateInput, db: Prisma.TransactionClient | typeof prisma = prisma) {
    return db.expense.create({ data, include: expenseInclude });
  },

  /**
   * Conditional transition from PENDING: two admins reviewing the same expense
   * at once cannot both succeed. Returns the number of updated rows (0 or 1).
   */
  async reviewIfPending(
    id: string,
    data: { status: ExpenseStatus; reviewedById: string; rejectionReason: string | null }
  ) {
    const { count } = await prisma.expense.updateMany({
      where: { id, status: "PENDING" },
      data: { ...data, reviewedAt: new Date() },
    });
    return count;
  },
};
