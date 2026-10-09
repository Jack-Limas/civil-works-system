import { IncidentStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

const person = { select: { id: true, name: true } } as const;

export const incidentListInclude = {
  project: { select: { id: true, name: true, responsibleId: true } },
  reportedBy: person,
  _count: { select: { evidence: true } },
} satisfies Prisma.IncidentInclude;

export const incidentDetailInclude = {
  project: { select: { id: true, name: true, municipality: true, responsibleId: true } },
  reportedBy: person,
  resolvedBy: person,
  statusChanges: { include: { changedBy: person }, orderBy: { createdAt: "asc" } },
  evidence: {
    select: { id: true, imageUrl: true, description: true, date: true, uploadedBy: person },
    orderBy: { date: "desc" },
  },
} satisfies Prisma.IncidentInclude;

export const incidentRepository = {
  findMany(where: Prisma.IncidentWhereInput, orderBy: Prisma.IncidentOrderByWithRelationInput[], skip: number, take: number) {
    return prisma.$transaction([
      prisma.incident.findMany({ where, orderBy, skip, take, include: incidentListInclude }),
      prisma.incident.count({ where }),
    ]);
  },

  /** KPI counts for the same scope in one round trip. */
  summary(scope: Prisma.IncidentWhereInput, monthStart: Date) {
    return prisma.$transaction([
      prisma.incident.count({ where: { ...scope, status: "OPEN" } }),
      prisma.incident.count({ where: { ...scope, status: "IN_REVIEW" } }),
      prisma.incident.count({ where: { ...scope, priority: "HIGH", status: { not: "RESOLVED" } } }),
      prisma.incident.count({ where: { ...scope, status: "RESOLVED", resolvedAt: { gte: monthStart } } }),
    ]);
  },

  findById(id: string) {
    return prisma.incident.findUnique({ where: { id }, include: { project: { select: { id: true, name: true, responsibleId: true } } } });
  },

  findDetail(id: string) {
    return prisma.incident.findUnique({ where: { id }, include: incidentDetailInclude });
  },

  create(tx: Prisma.TransactionClient, data: Prisma.IncidentUncheckedCreateInput) {
    return tx.incident.create({ data });
  },

  update(tx: Prisma.TransactionClient, id: string, data: Prisma.IncidentUncheckedUpdateInput) {
    return tx.incident.update({ where: { id }, data });
  },

  /** Moves the status only if nobody changed it meanwhile; 0 = lost the race. */
  async transitionIfStatus(tx: Prisma.TransactionClient, id: string, from: IncidentStatus, data: Prisma.IncidentUncheckedUpdateManyInput) {
    const { count } = await tx.incident.updateMany({ where: { id, status: from }, data });
    return count;
  },

  addStatusChange(tx: Prisma.TransactionClient, data: Prisma.IncidentStatusChangeUncheckedCreateInput) {
    return tx.incidentStatusChange.create({ data });
  },
};
