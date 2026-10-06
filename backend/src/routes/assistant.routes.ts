import { FastifyInstance } from "fastify";
import { assistantController } from "../controllers/assistant.controller";

export async function assistantRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);
  app.post("/assistant/ask", assistantController.ask);
}