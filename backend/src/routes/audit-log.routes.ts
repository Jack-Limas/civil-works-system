import { FastifyInstance } from "fastify";
import { auditLogController } from "../controllers/audit-log.controller";

/** Read-only and admin-only: there is no endpoint to edit or delete history. */
export async function auditLogRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", app.authorize(["ADMIN"]));

  app.get("/audit-logs", auditLogController.list);
  app.get("/audit-logs/actions", auditLogController.actions);
  app.get("/audit-logs/export", auditLogController.export);
}
