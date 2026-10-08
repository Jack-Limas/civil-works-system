import { FastifyInstance } from "fastify";
import { alertController } from "../controllers/alert.controller";

export async function alertRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/alerts", alertController.list);
  app.post("/alerts/generate", { preHandler: [app.authorize(["ADMIN"])] }, alertController.generateForAll);
  app.post("/alerts/generate/:projectId", alertController.generateForProject);
  app.patch<{ Params: { id: string } }>("/alerts/:id/resolve", { preHandler: [app.authorize(["ADMIN"])] }, alertController.resolve);
}