import { FastifyInstance } from "fastify";
import { expenseController } from "../controllers/expense.controller";

export async function expenseRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/expenses", expenseController.list);
  app.get("/expenses/project/:projectId/indicators", expenseController.indicators);
  app.post("/expenses", expenseController.create); // admin e ingeniero residente
}