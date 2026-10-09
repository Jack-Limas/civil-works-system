import { Prisma } from "@prisma/client";
import { auditLogRepository } from "../repositories/audit-log.repository";
import { AuditLogFilters, ListAuditLogsQuery } from "../schemas/audit.schema";
import { businessDayRange } from "../utils/business-time";

/** Upper bound for one CSV export; the UI tells the admin to narrow the filters beyond it. */
export const AUDIT_EXPORT_LIMIT = 5000;

function whereFrom(filters: AuditLogFilters): Prisma.AuditLogWhereInput {
  const createdAt: Prisma.DateTimeFilter = {};
  // Days are business days in Bogotá, not UTC days of the server
  if (filters.from) createdAt.gte = businessDayRange(filters.from).start;
  if (filters.to) createdAt.lt = businessDayRange(filters.to).end;

  return {
    ...(filters.actorId && { actorId: filters.actorId }),
    ...(filters.action && (filters.action.endsWith(".") ? { action: { startsWith: filters.action } } : { action: filters.action })),
    ...(filters.entityType && { entityType: filters.entityType }),
    ...(filters.entityId && { entityId: filters.entityId }),
    ...((filters.from || filters.to) && { createdAt }),
  };
}

export const auditLogService = {
  async list(query: ListAuditLogsQuery) {
    const [rows, total] = await auditLogRepository.findMany(whereFrom(query), (query.page - 1) * query.limit, query.limit);
    return {
      data: rows,
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  },

  async export(filters: AuditLogFilters) {
    const [rows, total] = await auditLogRepository.findMany(whereFrom(filters), 0, AUDIT_EXPORT_LIMIT);
    return { data: rows, total, truncated: total > rows.length };
  },

  async actions() {
    const groups = await auditLogRepository.actions();
    return groups.map((g) => ({ action: g.action, count: g._count._all }));
  },
};
