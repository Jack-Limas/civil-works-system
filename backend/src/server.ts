import Fastify from "fastify";
import cors from "@fastify/cors";
import authPlugin from "./plugins/auth.plugin";
import { authRoutes } from "./routes/auth.routes";
import { env } from "./config/env";

const app = Fastify({ logger: true });

async function main() {
  await app.register(cors, {
    origin: env.FRONTEND_URL,
    credentials: true,
  });

  await app.register(authPlugin);

  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  await app.register(authRoutes);

  try {
    await app.listen({ port: Number(env.PORT), host: "0.0.0.0" });
    console.log(`Backend running on http://localhost:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();