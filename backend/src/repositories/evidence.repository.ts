import { prisma } from "../config/prisma";

export const evidenceRepository = {
  findMany(filters: { projectId?: string; skip: number; take: number }) {
    const where = { ...(filters.projectId && { projectId: filters.projectId }) };

    return Promise.all([
      prisma.evidence.findMany({
        where,
        skip: filters.skip,
        take: filters.take,
        orderBy: { date: "desc" },
      }),
      prisma.evidence.count({ where }),
    ]);
  },

  create(data: {
    projectId: string;
    activityId?: string;
    description?: string;
    imageUrl: string;
    uploadedById: string;
  }) {
    return prisma.evidence.create({ data });
  },
};