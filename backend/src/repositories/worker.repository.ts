import { prisma } from "../config/prisma";
import { CreateWorkerInput, UpdateWorkerInput } from "../schemas/worker.schema";

export const workerRepository = {
  /** responsibleId limits the list to workers assigned to that resident's projects. */
  findMany(filters: { projectId?: string; responsibleId?: string; skip: number; take: number }) {
    const where = {
      ...(filters.projectId && { projectId: filters.projectId }),
      ...(filters.responsibleId && { project: { responsibleId: filters.responsibleId } }),
    };

    return Promise.all([
      prisma.worker.findMany({
        where,
        skip: filters.skip,
        take: filters.take,
        orderBy: { name: "asc" },
        include: { project: { select: { id: true, name: true } } },
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