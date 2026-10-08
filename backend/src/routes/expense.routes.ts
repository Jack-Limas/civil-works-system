import { FastifyInstance } from "fastify";
import { expenseController } from "../controllers/expense.controller";

export async function expenseRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/expenses", expenseController.list);
  app.get("/expenses/project/:projectId/indicators", expenseController.indicators);
  // Both roles register expenses; the initial status depends on the role
  app.post("/expenses", expenseController.create);
  app.patch<{ Params: { id: string } }>(
    "/expenses/:id/review",
    { preHandler: [app.authorize(["ADMIN"])] },
    expenseController.review
  );
}
