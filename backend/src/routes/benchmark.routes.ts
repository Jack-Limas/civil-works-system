import { FastifyInstance } from "fastify";
import { benchmarkController } from "../controllers/benchmark.controller";

export async function benchmarkRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/benchmark/main-thread", benchmarkController.mainThread);
  app.get("/benchmark/worker-thread", benchmarkController.workerThread);
}