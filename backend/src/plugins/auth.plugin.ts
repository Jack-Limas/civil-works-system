import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env";
import { AppError } from "../utils/app-error";
import { Role } from "../types/auth";
import { userStatus } from "../services/user-status.service";

/** The only routes a user with a temporary password can call (CLAUDE.md, users domain). */
const ALLOWED_WHILE_PASSWORD_CHANGE = new Set(["/auth/me", "/auth/logout", "/auth/change-password"]);

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

    // Account status is checked on every request (cached briefly), so a
    // deactivated user is locked out before their access token expires
    const status = await userStatus.get(request.user.sub);
    if (!status || !status.isActive) {
      throw new AppError(401, "This account is deactivated", { code: "ACCOUNT_DISABLED" });
    }
    if (status.mustChangePassword && !ALLOWED_WHILE_PASSWORD_CHANGE.has(request.routeOptions.url ?? "")) {
      throw new AppError(403, "Password change required", { code: "PASSWORD_CHANGE_REQUIRED" });
    }

    // The stored role wins over the token: a role change applies on the next request
    request.user.role = status.role;
    request.user.email = status.email;
    request.user.ip = request.ip;
    request.user.userAgent = request.headers["user-agent"];
  });

  app.decorate("authorize", (roles: Role[]) => {
    return async (request: FastifyRequest, _reply: FastifyReply) => {
      if (!request.user || !roles.includes(request.user.role)) {
        throw new AppError(403, "Forbidden: insufficient permissions");
      }
    };
  });
});
