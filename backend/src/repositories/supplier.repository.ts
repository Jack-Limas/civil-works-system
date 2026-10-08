import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { CreateSupplierInput, UpdateSupplierInput } from "../schemas/supplier.schema";

export const supplierRepository = {
  findMany(filters: { search?: string; skip: number; take: number }) {
    const where: Prisma.SupplierWhereInput = filters.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { nit: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {};

    return Promise.all([
      prisma.supplier.findMany({ where, skip: filters.skip, take: filters.take, orderBy: { name: "asc" } }),
      prisma.supplier.count({ where }),
    ]);
  },

  findById(id: string) {
    return prisma.supplier.findUnique({ where: { id } });
  },

  findByNit(nit: string) {
    return prisma.supplier.findUnique({ where: { nit } });
  },

  findManyByIds(ids: string[]) {
    return prisma.supplier.findMany({ where: { id: { in: ids } } });
  },

  countExpenses(id: string) {
    return prisma.expense.count({ where: { supplierId: id } });
  },

  create(data: CreateSupplierInput) {
    return prisma.supplier.create({ data });
  },

  update(id: string, data: UpdateSupplierInput) {
    return prisma.supplier.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.supplier.delete({ where: { id } });
  },

  /** Purchase totals per supplier computed in the database (APPROVED expenses only). */
  approvedTotalsBySupplier() {
    return prisma.expense.groupBy({
      by: ["supplierId"],
      where: { status: "APPROVED", supplierId: { not: null } },
      _sum: { amount: true },
      _count: { _all: true },
      _max: { date: true },
    });
  },
};
