import { FastifyInstance } from "fastify";
import { supplierController } from "../controllers/supplier.controller";

export async function supplierRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  // Both roles list suppliers and create them inline (residents: name + NIT only)
  app.get("/suppliers", supplierController.list);
  app.post("/suppliers", supplierController.create);

  // Global purchase statistics and maintenance are admin-only
  app.get("/suppliers/stats", { preHandler: [app.authorize(["ADMIN"])] }, supplierController.stats);
  app.patch<{ Params: { id: string } }>(
    "/suppliers/:id",
    { preHandler: [app.authorize(["ADMIN"])] },
    supplierController.update
  );
  app.delete<{ Params: { id: string } }>(
    "/suppliers/:id",
    { preHandler: [app.authorize(["ADMIN"])] },
    supplierController.remove
  );
}
