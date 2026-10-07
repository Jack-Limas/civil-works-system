import { FastifyInstance } from "fastify";
import { projectController } from "../controllers/project.controller";

export async function projectRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate); // todas las rutas requieren sesión

  app.get("/projects", projectController.list);
  app.get("/projects/:id", projectController.getById);

  app.post("/projects", { preHandler: [app.authorize(["ADMIN"])] }, projectController.create);
  
  // PERMITIR QUE TANTO ADMIN COMO RESIDENTE PUEDAN ACTUALIZAR LA OBRA
  app.patch("/projects/:id", { preHandler: [app.authorize(["ADMIN", "RESIDENT_ENGINEER"])] }, projectController.update);
  
  app.delete("/projects/:id", { preHandler: [app.authorize(["ADMIN"])] }, projectController.remove);
}