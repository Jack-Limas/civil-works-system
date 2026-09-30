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

  delete(id: string) {
    return prisma.project.delete({ where: { id } });
  },
};