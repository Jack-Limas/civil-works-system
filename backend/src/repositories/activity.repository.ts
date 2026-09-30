import { prisma } from "../config/prisma";
import { CreateActivityInput } from "../schemas/activity.schema";

export const activityRepository = {
  findMany(filters: { projectId?: string; skip: number; take: number }) {
    const where = { ...(filters.projectId && { projectId: filters.projectId }) };

    return Promise.all([
      prisma.activity.findMany({
        where,
        skip: filters.skip,
        take: filters.take,
        orderBy: { date: "desc" },
        include: { responsible: { select: { id: true, name: true } } },
      }),
      prisma.activity.count({ where }),
    ]);
  },

  findLastByProject(projectId: string) {
    return prisma.activity.findFirst({
      where: { projectId },
      orderBy: { date: "desc" },
    });
  },

  create(data: CreateActivityInput) {
    return prisma.activity.create({ data });
  },
};