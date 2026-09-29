import { FastifyInstance } from "fastify";
import { buildAuthController } from "../controllers/auth.controller";

export async function authRoutes(app: FastifyInstance) {
  const controller = buildAuthController(app);

  app.post("/auth/login", controller.login);
  app.post("/auth/refresh", controller.refresh);
  app.post("/auth/logout", { preHandler: [app.authenticate] }, controller.logout);
  app.get("/auth/me", { preHandler: [app.authenticate] }, controller.me);

  // Solo un ADMIN puede crear nuevos usuarios (admins o ingenieros residentes)
  app.post(
    "/auth/register",
    { preHandler: [app.authenticate, app.authorize(["ADMIN"])] },
    controller.register
  );
}