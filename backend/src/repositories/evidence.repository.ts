import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

export const evidenceRepository = {
  findMany(filters: { projectId?: string; responsibleId?: string; skip: number; take: number }) {
    const where: Prisma.EvidenceWhereInput = {
      ...(filters.projectId && { projectId: filters.projectId }),
      ...(filters.responsibleId && { project: { responsibleId: filters.responsibleId } }),
    };

    return Promise.all([
      prisma.evidence.findMany({
        where,
        skip: filters.skip,
        take: filters.take,
        orderBy: { date: "desc" },
        include: {
          project: { select: { id: true, name: true } },
          uploadedBy: { select: { id: true, name: true } },
        },
      }),
      prisma.evidence.count({ where }),
    ]);
  },

  create(data: {
    projectId: string;
    activityId?: string;
    incidentId?: string;
    description?: string;
    imageUrl: string;
    uploadedById: string;
  }) {
    return prisma.evidence.create({ data });
  },
};