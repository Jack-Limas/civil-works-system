import { FastifyInstance } from "fastify";
import { incidentController } from "../controllers/incident.controller";

/**
 * Admins and residents (on their own projects). Role rules (who may edit,
 * advance or reopen) live in incidentService so they apply to every route.
 */
export async function incidentRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/incidents", incidentController.list);
  app.post("/incidents", incidentController.create);
  app.get<{ Params: { id: string } }>("/incidents/:id", incidentController.detail);
  app.patch<{ Params: { id: string } }>("/incidents/:id", incidentController.update);
  app.post<{ Params: { id: string } }>("/incidents/:id/status", incidentController.changeStatus);
}
