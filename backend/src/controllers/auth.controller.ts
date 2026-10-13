import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { buildAuthService } from "../services/auth.service";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../utils/password";

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

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(PASSWORD_MAX_LENGTH),
  newPassword: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
});

/**
 * In production the frontend (Vercel) and the API (Render) live on different
 * sites, so the session cookies must be SameSite=None; Secure or the browser
 * never sends them back to the API. Locally both run on localhost (same site)
 * and Lax works over plain http.
 */
const isProduction = process.env.NODE_ENV === "production";
const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? ("none" as const) : ("lax" as const),
  path: "/",
};

function setAuthCookies(reply: FastifyReply, accessToken: string, refreshToken: string) {
  reply.setCookie("accessToken", accessToken, cookieOptions);
  reply.setCookie("refreshToken", refreshToken, cookieOptions);
}

/** Same attributes as when setting them: browsers ignore a clear that does not match. */
function clearAuthCookies(reply: FastifyReply) {
  reply.clearCookie("accessToken", cookieOptions);
  reply.clearCookie("refreshToken", cookieOptions);
}

/** Bearer token sent by the frontend as a fallback when the browser blocks third-party cookies. */
function bearerToken(request: FastifyRequest): string | undefined {
  const header = request.headers.authorization;
  return header && /^Bearer\s+\S+/i.test(header) ? header.replace(/^Bearer\s+/i, "").trim() : undefined;
}

export function buildAuthController(app: FastifyInstance) {
  const authService = buildAuthService(app);

  return {
    async login(request: FastifyRequest, reply: FastifyReply) {
      const body = loginSchema.parse(request.body);
      const result = await authService.login(body.email, body.password, {
        ip: request.ip,
        userAgent: request.headers["user-agent"],
      });
      setAuthCookies(reply, result.accessToken, result.refreshToken);
      // accessToken in the body (additive) lets the client use a Bearer header if cookies are blocked
      return reply.send({ user: result.user, accessToken: result.accessToken });
    },

    /**
     * On any failure the session cookies are cleared: a stale accessToken cookie
     * would otherwise make the frontend proxy keep treating the visitor as
     * logged in (login -> dashboard -> 401 -> login redirect loop).
     */
    async refresh(request: FastifyRequest, reply: FastifyReply) {
      const refreshToken = request.cookies.refreshToken;
      if (!refreshToken) {
        clearAuthCookies(reply);
        return reply.code(401).send({ error: "Refresh token missing", message: "Refresh token missing" });
      }

      // The (possibly expired) access token only tells whose session it is.
      // decode() asserts on an empty string, so it is never called without a token.
      const expiredToken = request.cookies.accessToken || bearerToken(request);
      let userId: string | undefined;
      if (expiredToken) {
        try {
          userId = (app.jwt.decode(expiredToken) as { sub?: string } | null)?.sub;
        } catch {
          userId = undefined;
        }
      }
      const body = request.body as { userId?: string } | undefined;
      userId ??= typeof body?.userId === "string" ? body.userId : undefined;

      if (!userId) {
        clearAuthCookies(reply);
        return reply.code(401).send({ error: "Session expired", message: "Session expired" });
      }

      try {
        const result = await authService.refresh(userId, refreshToken);
        setAuthCookies(reply, result.accessToken, result.refreshToken);
        return reply.send({ ok: true, accessToken: result.accessToken });
      } catch (error) {
        clearAuthCookies(reply);
        throw error;
      }
    },

    async logout(request: FastifyRequest, reply: FastifyReply) {
      await authService.logout(request.user);
      clearAuthCookies(reply);
      return reply.send({ ok: true });
    },

    async me(request: FastifyRequest, reply: FastifyReply) {
      const user = await authService.me(request.user.sub);
      return reply.send({ user });
    },

    /** Signs out every other session; this one gets a fresh token pair. */
    async changePassword(request: FastifyRequest, reply: FastifyReply) {
      const body = changePasswordSchema.parse(request.body);
      const result = await authService.changePassword(request.user, body.currentPassword, body.newPassword);
      setAuthCookies(reply, result.accessToken, result.refreshToken);
      return reply.send({ user: result.user, accessToken: result.accessToken, revokedSessions: result.revokedSessions });
    },

    async register(request: FastifyRequest, reply: FastifyReply) {
      const body = registerSchema.parse(request.body);
      const user = await authService.register(body, request.user);
      return reply.code(201).send({ user });
    },
  };
}