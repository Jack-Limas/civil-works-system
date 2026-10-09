import { FastifyInstance } from "fastify";
import { userController } from "../controllers/user.controller";

/** User management is admin-only end to end. */
export async function userRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", app.authorize(["ADMIN"]));

  app.get("/users", userController.list);
  app.post("/users", userController.create);
  app.get<{ Params: { id: string } }>("/users/:id", userController.detail);
  app.patch<{ Params: { id: string } }>("/users/:id", userController.update);
  app.post<{ Params: { id: string } }>("/users/:id/deactivate", userController.deactivate);
  app.post<{ Params: { id: string } }>("/users/:id/activate", userController.activate);
  app.post<{ Params: { id: string } }>("/users/:id/reset-password", userController.resetPassword);
}
