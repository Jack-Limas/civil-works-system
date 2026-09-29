import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { buildAuthService } from "../services/auth.service";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "RESIDENT_ENGINEER"]),
});

function setAuthCookies(reply: FastifyReply, accessToken: string, refreshToken: string) {
  reply.setCookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  reply.setCookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export function buildAuthController(app: any) {
  const authService = buildAuthService(app);

  return {
    async login(request: FastifyRequest, reply: FastifyReply) {
      const body = loginSchema.parse(request.body);
      const result = await authService.login(body.email, body.password);
      setAuthCookies(reply, result.accessToken, result.refreshToken);
      return reply.send({ user: result.user });
    },

    async refresh(request: FastifyRequest, reply: FastifyReply) {
      const refreshToken = request.cookies.refreshToken;
      if (!refreshToken) return reply.code(401).send({ error: "Missing refresh token" });

      const decoded = app.jwt.decode(request.cookies.accessToken || "") as { sub?: string } | null;
      const body = request.body as { userId?: string } | undefined;
      const userId = decoded?.sub ?? body?.userId;

      if (!userId) return reply.code(401).send({ error: "Cannot resolve user" });

      const result = await authService.refresh(userId, refreshToken);
      setAuthCookies(reply, result.accessToken, result.refreshToken);
      return reply.send({ ok: true });
    },

    async logout(request: FastifyRequest, reply: FastifyReply) {
      const user = request.user as { sub: string };
      await authService.logout(user.sub);
      reply.clearCookie("accessToken", { path: "/" });
      reply.clearCookie("refreshToken", { path: "/" });
      return reply.send({ ok: true });
    },

    async me(request: FastifyRequest, reply: FastifyReply) {
      return reply.send({ user: request.user });
    },

    async register(request: FastifyRequest, reply: FastifyReply) {
      const body = registerSchema.parse(request.body);
      const user = await authService.register(body);
      return reply.code(201).send({ user });
    },
  };
}