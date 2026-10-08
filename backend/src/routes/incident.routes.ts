import { FastifyInstance } from "fastify";
import { incidentController } from "../controllers/incident.controller";

export async function incidentRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/incidents", incidentController.list);
  app.post("/incidents", incidentController.create); // admin e ingeniero residente
  app.patch<{ Params: { id: string } }>("/incidents/:id", { preHandler: [app.authorize(["ADMIN"])] }, incidentController.update);
}