import { FastifyInstance } from "fastify";
import { materialController } from "../controllers/material.controller";

/**
 * Static segments (/summary, /low-stock, /movements) always win over the
 * parametric /:id in Fastify's radix router, independent of declaration order;
 * they are still declared first so the precedence is obvious when reading.
 * The movement ledger is append-only: there is no PATCH or DELETE for movements.
 */
export async function materialRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/materials", materialController.list);
  app.get("/materials/summary", materialController.summary);
  app.get("/materials/low-stock", materialController.lowStock);
  app.get("/materials/movements", materialController.listMovements);
  // Both roles; the service enforces IN/OUT and ownership rules per role
  app.post("/materials/movements", materialController.registerMovement);

  // Both roles create (residents: name + unit only); only admins edit
  app.post("/materials", materialController.create);
  app.get<{ Params: { id: string } }>("/materials/:id", materialController.detail);
  app.patch<{ Params: { id: string } }>(
    "/materials/:id",
    { preHandler: [app.authorize(["ADMIN"])] },
    materialController.update
  );
}
