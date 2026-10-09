import { FastifyInstance } from "fastify";
import { settingsController } from "../controllers/settings.controller";

export async function settingsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/settings/public", settingsController.getPublic);

  const adminOnly = { preHandler: [app.authorize(["ADMIN"])] };
  app.get("/settings", adminOnly, settingsController.get);
  app.put("/settings", adminOnly, settingsController.update);
  app.post("/settings/reset", adminOnly, settingsController.reset);
}
