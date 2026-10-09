import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

const auditInclude = { actor: { select: { id: true, name: true, email: true, role: true } } } satisfies Prisma.AuditLogInclude;

/** Read-only on purpose: the audit log is append-only and has no update or delete here. */
export const auditLogRepository = {
  findMany(where: Prisma.AuditLogWhereInput, skip: number, take: number) {
    return prisma.$transaction([
      prisma.auditLog.findMany({ where, include: auditInclude, orderBy: { createdAt: "desc" }, skip, take }),
      prisma.auditLog.count({ where }),
    ]);
  },

  /** Distinct action codes with their count, for the history filter. */
  actions() {
    return prisma.auditLog.groupBy({ by: ["action"], _count: { _all: true }, orderBy: { action: "asc" } });
  },

  /** Most recent events about or by a user (user detail screen). */
  forUser(userId: string, take: number) {
    return prisma.auditLog.findMany({
      where: { OR: [{ actorId: userId }, { entityType: "user", entityId: userId }] },
      include: auditInclude,
      orderBy: { createdAt: "desc" },
      take,
    });
  },
};
