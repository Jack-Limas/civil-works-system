import { prisma } from "../config/prisma";
import { AlertType, AlertStatus, Priority, Prisma } from "@prisma/client";

export const alertRepository = {
  findMany(filters: {
    projectId?: string;
    status?: AlertStatus;
    responsibleId?: string;
    skip: number;
    take: number;
  }) {
    const where: Prisma.AlertWhereInput = {
      ...(filters.projectId && { projectId: filters.projectId }),
      ...(filters.status && { status: filters.status }),
      ...(filters.responsibleId && { project: { responsibleId: filters.responsibleId } }),
    };

    return Promise.all([
      prisma.alert.findMany({
        where,
        skip: filters.skip,
        take: filters.take,
        orderBy: { createdAt: "desc" },
        include: { project: { select: { id: true, name: true } } },
      }),
      prisma.alert.count({ where }),
    ]);
  },

  findActiveByProjectAndType(projectId: string, type: AlertType) {
    return prisma.alert.findFirst({
      where: { projectId, type, status: "ACTIVE" },
    });
  },

  countActive(responsibleId?: string) {
    return prisma.alert.count({
      where: { status: "ACTIVE", ...(responsibleId && { project: { responsibleId } }) },
    });
  },

  countActiveByProject(responsibleId?: string) {
    return prisma.alert.groupBy({
      by: ["projectId"],
      where: { status: "ACTIVE", ...(responsibleId && { project: { responsibleId } }) },
      _count: true,
    });
  },

  create(data: {
    projectId: string;
    type: AlertType;
    message: string;
    severity: Priority;
    params?: Record<string, number>;
  }) {
    return prisma.alert.create({ data });
  },

  resolve(id: string) {
    return prisma.alert.update({ where: { id }, data: { status: "RESOLVED" } });
  },
};