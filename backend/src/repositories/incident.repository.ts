import { prisma } from "../config/prisma";
import { CreateIncidentInput, UpdateIncidentInput } from "../schemas/incident.schema";
import { IncidentStatus, Prisma } from "@prisma/client";

export const incidentRepository = {
  findMany(filters: {
    projectId?: string;
    status?: IncidentStatus;
    responsibleId?: string;
    skip: number;
    take: number;
  }) {
    const where: Prisma.IncidentWhereInput = {
      ...(filters.projectId && { projectId: filters.projectId }),
      ...(filters.status && { status: filters.status }),
      ...(filters.responsibleId && { project: { responsibleId: filters.responsibleId } }),
    };

    return Promise.all([
      prisma.incident.findMany({
        where,
        skip: filters.skip,
        take: filters.take,
        // Prioridad alta primero, luego más reciente — estructura ordenada
        // que pide tu documento para "ordenar alertas/novedades por prioridad"
        orderBy: [{ priority: "desc" }, { date: "desc" }],
        include: { project: { select: { id: true, name: true } } },
      }),
      prisma.incident.count({ where }),
    ]);
  },

  findById(id: string) {
    return prisma.incident.findUnique({ where: { id } });
  },

  create(data: CreateIncidentInput) {
    return prisma.incident.create({ data });
  },

  update(id: string, data: UpdateIncidentInput) {
    return prisma.incident.update({ where: { id }, data });
  },
};