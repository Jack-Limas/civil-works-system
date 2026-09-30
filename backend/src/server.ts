import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { ZodError } from "zod";
import authPlugin from "./plugins/auth.plugin";
import { authRoutes } from "./routes/auth.routes";
import { projectRoutes } from "./routes/project.routes";
import { activityRoutes } from "./routes/activity.routes";
import { materialRoutes } from "./routes/material.routes";
import { workerRoutes } from "./routes/worker.routes";
import { expenseRoutes } from "./routes/expense.routes";
import { alertRoutes } from "./routes/alert.routes";
import { dashboardRoutes } from "./routes/dashboard.routes";
import { incidentRoutes } from "./routes/incident.routes";
import { evidenceRoutes } from "./routes/evidence.routes";
import { env } from "./config/env";
import { AppError } from "./utils/app-error";

const app = Fastify({ logger: true });

async function main() {
  await app.register(cors, {
    origin: env.FRONTEND_URL,
    credentials: true,
  });

  await app.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB máximo por imagen
  });

  await app.register(authPlugin);

  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  // Registrar Rutas
  await app.register(authRoutes);
  await app.register(projectRoutes);
  await app.register(activityRoutes);
  await app.register(materialRoutes);
  await app.register(workerRoutes);
  await app.register(expenseRoutes);
  await app.register(incidentRoutes);
  await app.register(evidenceRoutes);
  await app.register(alertRoutes);

  // Error Handler Global
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: "Validation error",
        details: error.issues.map((e) => ({ path: e.path.join("."), message: e.message })),
      });
    }

    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({ error: error.message });
    }

    request.log.error(error);
    return reply.code(500).send({ error: "Internal server error" });
  });

  try {
    await app.listen({ port: Number(env.PORT), host: "0.0.0.0" });
    console.log(`Backend running on http://localhost:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();