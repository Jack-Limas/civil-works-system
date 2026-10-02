import { FastifyInstance } from "fastify";
import { predictionController } from "../controllers/prediction.controller";

export async function predictionRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.post("/predictions/generate/:projectId", predictionController.generate);
  app.get("/predictions/project/:projectId", predictionController.history);
  app.get("/predictions/project/:projectId/compare", predictionController.compare);
}