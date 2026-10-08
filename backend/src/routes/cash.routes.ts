import { FastifyInstance } from "fastify";
import { cashController } from "../controllers/cash.controller";

export async function cashRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  // Admin: every transfer / balance. Resident: only their own (scoped in the services).
  app.get("/fund-transfers", cashController.listTransfers);
  app.get("/cash/balances", cashController.balances);

  // Only admins send money to residents
  app.post("/fund-transfers", { preHandler: [app.authorize(["ADMIN"])] }, cashController.createTransfer);
}
