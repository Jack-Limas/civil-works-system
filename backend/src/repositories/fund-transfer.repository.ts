import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

export const fundTransferInclude = {
  resident: { select: { id: true, name: true } },
  project: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.FundTransferInclude;

export const fundTransferRepository = {
  findMany(where: Prisma.FundTransferWhereInput, skip: number, take: number) {
    return Promise.all([
      prisma.fundTransfer.findMany({
        where,
        skip,
        take,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        include: fundTransferInclude,
      }),
      prisma.fundTransfer.count({ where }),
    ]);
  },

  create(data: Prisma.FundTransferUncheckedCreateInput) {
    return prisma.fundTransfer.create({ data, include: fundTransferInclude });
  },

  /** Total received per resident, computed in the database. */
  sumByResident(residentIds: string[]) {
    return prisma.fundTransfer.groupBy({
      by: ["residentId"],
      where: { residentId: { in: residentIds } },
      _sum: { amount: true },
      _count: { _all: true },
      _max: { date: true },
    });
  },

  /**
   * Resident-funded spend per resident and status. Only expenses REGISTERED BY
   * the resident count: company payments (registeredById = admin or NULL for
   * expenses created before the finance module) never match a resident id.
   */
  sumResidentExpenses(residentIds: string[]) {
    return prisma.expense.groupBy({
      by: ["registeredById", "status"],
      where: { registeredById: { in: residentIds }, status: { in: ["PENDING", "APPROVED"] } },
      _sum: { amount: true },
    });
  },
};
