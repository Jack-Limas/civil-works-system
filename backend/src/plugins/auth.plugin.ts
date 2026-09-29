import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env";

export default fp(async (app: FastifyInstance) => {
  await app.register(fastifyCookie, { secret: env.COOKIE_SECRET });

  await app.register(fastifyJwt, {
    secret: env.JWT_ACCESS_SECRET,
    cookie: { cookieName: "accessToken", signed: false },
  });

  app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ error: "Unauthorized: invalid or expired token" });
    }
  });

  app.decorate("authorize", (roles: Array<"ADMIN" | "RESIDENT_ENGINEER">) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user as { role: "ADMIN" | "RESIDENT_ENGINEER" };
      if (!user || !roles.includes(user.role)) {
        reply.code(403).send({ error: "Forbidden: insufficient permissions" });
      }
    };
  });
});