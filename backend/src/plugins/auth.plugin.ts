import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env";
import { AppError } from "../utils/app-error";
import { Role } from "../types/auth";

export default fp(async (app: FastifyInstance) => {
  await app.register(fastifyCookie, { secret: env.COOKIE_SECRET });

  await app.register(fastifyJwt, {
    secret: env.JWT_ACCESS_SECRET,
    cookie: { cookieName: "accessToken", signed: false },
  });

  // Throwing (instead of reply.send without return) guarantees the route
  // handler never runs after a failed check.
  app.decorate("authenticate", async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      throw new AppError(401, "Unauthorized: invalid or expired token");
    }
  });

  app.decorate("authorize", (roles: Role[]) => {
    return async (request: FastifyRequest, _reply: FastifyReply) => {
      if (!request.user || !roles.includes(request.user.role)) {
        throw new AppError(403, "Forbidden: insufficient permissions");
      }
    };
  });
});
