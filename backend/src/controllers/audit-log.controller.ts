import { FastifyReply, FastifyRequest } from "fastify";
import { exportAuditLogsQuerySchema, listAuditLogsQuerySchema } from "../schemas/audit.schema";
import { auditLogService } from "../services/audit-log.service";

export const auditLogController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = listAuditLogsQuerySchema.parse(request.query);
    return reply.send(await auditLogService.list(query));
  },

  /** Same filters, up to AUDIT_EXPORT_LIMIT rows; the client builds the translated CSV. */
  async export(request: FastifyRequest, reply: FastifyReply) {
    const filters = exportAuditLogsQuerySchema.parse(request.query);
    return reply.send(await auditLogService.export(filters));
  },

  async actions(_request: FastifyRequest, reply: FastifyReply) {
    return reply.send({ data: await auditLogService.actions() });
  },
};
