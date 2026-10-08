import { prisma } from "../config/prisma";
import { CreateProjectInput, UpdateProjectInput } from "../schemas/project.schema";
import { ProjectStatus } from "@prisma/client";

export const projectRepository = {
  findMany(filters: { status?: ProjectStatus; responsibleId?: string; skip: number; take: number }) {
    const where = {
      ...(filters.status && { status: filters.status }),
      ...(filters.responsibleId && { responsibleId: filters.responsibleId }),
    };

    return Promise.all([
      prisma.project.findMany({
        where,
        skip: filters.skip,
        take: filters.take,
        orderBy: { createdAt: "desc" },
        include: { responsible: { select: { id: true, name: true } } },
      }),
      prisma.project.count({ where }),
    ]);
  },

  findById(id: string) {
    return prisma.project.findUnique({
      where: { id },
      include: { responsible: { select: { id: true, name: true, email: true } } },
    });
  },

  create(data: CreateProjectInput) {
    return prisma.project.create({ data });
  },

  update(id: string, data: UpdateProjectInput) {
    return prisma.project.update({ where: { id }, data });
  },

  /**
   * Records that would be lost (cascade) or orphaned if the project were deleted.
   * Used to refuse deleting projects that already carry accounting or field data.
   */
  async countDependents(id: string) {
    const [expenses, activities, evidence, inventoryMovements, fundTransfers] = await Promise.all([
      prisma.expense.count({ where: { projectId: id } }),
      prisma.activity.count({ where: { projectId: id } }),
      prisma.evidence.count({ where: { projectId: id } }),
      prisma.inventoryMovement.count({ where: { projectId: id } }),
      prisma.fundTransfer.count({ where: { projectId: id } }),
    ]);
    return { expenses, activities, evidence, inventoryMovements, fundTransfers };
  },

  delete(id: string) {
    return prisma.project.delete({ where: { id } });
  },
};