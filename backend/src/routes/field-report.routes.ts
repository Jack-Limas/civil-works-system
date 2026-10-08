import { FastifyInstance } from "fastify";
import { fieldReportController } from "../controllers/field-report.controller";

/**
 * Daily site logs. Both roles create them on projects they can access (the
 * author comes from the session); the author edits while SUBMITTED; only
 * admins review, after which the log is immutable. /compile is static and
 * therefore matched before the parametric /:id.
 */
export async function fieldReportRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/field-reports", fieldReportController.list);
  app.get("/field-reports/compile", fieldReportController.compile);
  app.post("/field-reports", fieldReportController.create);
  app.get<{ Params: { id: string } }>("/field-reports/:id", fieldReportController.detail);
  app.patch<{ Params: { id: string } }>("/field-reports/:id", fieldReportController.update);
  app.patch<{ Params: { id: string } }>(
    "/field-reports/:id/review",
    { preHandler: [app.authorize(["ADMIN"])] },
    fieldReportController.review
  );
}
