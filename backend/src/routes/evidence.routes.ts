import { FastifyInstance } from "fastify";
import { evidenceController } from "../controllers/evidence.controller";

export async function evidenceRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/evidence", evidenceController.list);
  app.post("/evidence", evidenceController.upload);
}