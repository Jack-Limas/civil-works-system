import { FastifyInstance } from "fastify";
import { userController } from "../controllers/user.controller";

export async function userRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/users", { preHandler: [app.authorize(["ADMIN"])] }, userController.list);
}
