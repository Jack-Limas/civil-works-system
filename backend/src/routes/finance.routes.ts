import { FastifyInstance } from "fastify";
import { financeController } from "../controllers/finance.controller";

export async function financeRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  // Both roles; every figure is scoped to the requester's projects in the service
  app.get("/finance/summary", financeController.summary);
  app.get("/finance/cashflow", financeController.cashflow);
}
