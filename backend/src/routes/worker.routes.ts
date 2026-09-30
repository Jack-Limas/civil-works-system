import { FastifyInstance } from "fastify";
import { workerController } from "../controllers/worker.controller";

export async function workerRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/workers", workerController.list);
  app.post("/workers", { preHandler: [app.authorize(["ADMIN"])] }, workerController.create);
  app.patch("/workers/:id", { preHandler: [app.authorize(["ADMIN"])] }, workerController.update);
}