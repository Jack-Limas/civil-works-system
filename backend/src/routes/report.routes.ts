import { FastifyInstance } from "fastify";
import { reportController } from "../controllers/report.controller";

/**
 * GET /reports/progress | financial | materials | incidents
 * Both roles; data is scoped by role in the service and the financial report
 * answers 403 to residents. POST /reports/summary asks Gemini for an
 * executive summary of the same server-computed data.
 */
export async function reportRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.post("/reports/summary", reportController.summary);
  app.get<{ Params: { type: string } }>("/reports/:type", reportController.generate);
}
