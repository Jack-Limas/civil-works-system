import { FastifyInstance } from "fastify";
import { activityController } from "../controllers/activity.controller";

export async function activityRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/activities", activityController.list);
  app.post("/activities", activityController.create); // admin e ingeniero residente pueden registrar avances
}