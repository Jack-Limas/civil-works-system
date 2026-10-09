import { FastifyInstance } from "fastify";
import { workerController } from "../controllers/worker.controller";

/**
 * Residents read the workers of their own projects (without personal data);
 * only admins create, edit, activate or deactivate. There is no DELETE:
 * workers are deactivated so their history stays intact.
 */
export async function workerRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);
  const adminOnly = { preHandler: [app.authorize(["ADMIN"])] };

  app.get("/workers", workerController.list);
  app.get<{ Params: { id: string } }>("/workers/:id", workerController.detail);
  app.post("/workers", adminOnly, workerController.create);
  app.patch<{ Params: { id: string } }>("/workers/:id", adminOnly, workerController.update);
  app.post<{ Params: { id: string } }>("/workers/:id/deactivate", adminOnly, workerController.deactivate);
  app.post<{ Params: { id: string } }>("/workers/:id/activate", adminOnly, workerController.activate);
}
