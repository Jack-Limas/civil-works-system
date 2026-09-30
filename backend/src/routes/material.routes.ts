import { FastifyInstance } from "fastify";
import { materialController } from "../controllers/material.controller";

export async function materialRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/materials", materialController.list);
  app.get("/materials/low-stock", materialController.lowStock);
  app.post("/materials", { preHandler: [app.authorize(["ADMIN"])] }, materialController.create);
  app.post("/materials/movements", materialController.registerMovement); // admin e ingeniero residente
}