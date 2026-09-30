import { prisma } from "../config/prisma";
import { CreateWorkerInput, UpdateWorkerInput } from "../schemas/worker.schema";

export const workerRepository = {
  findMany(filters: { projectId?: string; skip: number; take: number }) {
    const where = { ...(filters.projectId && { projectId: filters.projectId }) };

    return Promise.all([
      prisma.worker.findMany({
        where,
        skip: filters.skip,
        take: filters.take,
        orderBy: { name: "asc" },
      }),
      prisma.worker.count({ where }),
    ]);
  },

  findByDocumentId(documentId: string) {
    return prisma.worker.findUnique({ where: { documentId } });
  },

  findById(id: string) {
    return prisma.worker.findUnique({ where: { id } });
  },

  create(data: CreateWorkerInput) {
    return prisma.worker.create({ data });
  },

  update(id: string, data: UpdateWorkerInput) {
    return prisma.worker.update({ where: { id }, data });
  },
};