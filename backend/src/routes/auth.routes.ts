import { FastifyInstance } from "fastify";
import { buildAuthController } from "../controllers/auth.controller";

export async function authRoutes(app: FastifyInstance) {
  const controller = buildAuthController(app);

  app.post("/auth/login", controller.login);
  app.post("/auth/refresh", controller.refresh);
  app.post("/auth/logout", { preHandler: [app.authenticate] }, controller.logout);
  app.get("/auth/me", { preHandler: [app.authenticate] }, controller.me);
  // Reachable while mustChangePassword is set (see auth.plugin)
  app.post("/auth/change-password", { preHandler: [app.authenticate] }, controller.changePassword);

  // Kept for compatibility: only an ADMIN can create users (POST /users is the full flow)
  app.post(
    "/auth/register",
    { preHandler: [app.authenticate, app.authorize(["ADMIN"])] },
    controller.register
  );
}