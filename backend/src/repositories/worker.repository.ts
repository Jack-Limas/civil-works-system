import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

const workerInclude = { project: { select: { id: true, name: true, responsibleId: true } } } satisfies Prisma.WorkerInclude;

export const workerRepository = {
  findMany(where: Prisma.WorkerWhereInput, skip: number, take: number) {
    return prisma.$transaction([
      prisma.worker.findMany({
        where,
        skip,
        take,
        orderBy: [{ status: "asc" }, { name: "asc" }],
        include: workerInclude,
      }),
      prisma.worker.count({ where }),
    ]);
  },

  /** KPIs and the trade list for the filter, for the caller's scope, in one round trip. */
  summary(scope: Prisma.WorkerWhereInput) {
    return prisma.$transaction([
      prisma.worker.groupBy({ by: ["status"], where: scope, _count: { _all: true }, orderBy: { status: "asc" } }),
      prisma.worker.count({ where: { ...scope, projectId: null } }),
      prisma.worker.groupBy({ by: ["position"], where: scope, _count: { _all: true }, orderBy: { position: "asc" } }),
    ]);
  },

  findByDocumentId(documentId: string) {
    return prisma.worker.findUnique({ where: { documentId } });
  },

  findById(id: string) {
    return prisma.worker.findUnique({ where: { id }, include: workerInclude });
  },

  create(tx: Prisma.TransactionClient, data: Prisma.WorkerUncheckedCreateInput) {
    return tx.worker.create({ data, include: workerInclude });
  },

  update(tx: Prisma.TransactionClient, id: string, data: Prisma.WorkerUncheckedUpdateInput) {
    return tx.worker.update({ where: { id }, data, include: workerInclude });
  },
};
