import bcrypt from "bcrypt";
import crypto from "crypto";
import { FastifyInstance } from "fastify";
import { User } from "@prisma/client";
import { prisma } from "../config/prisma";
import { userRepository } from "../repositories/user.repository";
import { refreshTokenRepository } from "../repositories/refresh-token.repository";
import { env } from "../config/env";
import { AppError } from "../utils/app-error";
import { loginThrottle } from "../utils/login-throttle";
import { hashPassword, verifyPassword } from "../utils/password";
import { RequestUser } from "../types/auth";
import { audit, AUDIT_ACTIONS, AuditContext } from "./audit.service";
import { userStatus } from "./user-status.service";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function ttlToMs(ttl: string): number {
  const match = ttl.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error("Invalid TTL format");
  const value = Number(match[1]);
  const unit = match[2];
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit]!;
  return value * unitMs;
}

/** Public shape of the session user. mustChangePassword was added (additive) for the forced-change flow. */
function presentUser(user: Pick<User, "id" | "name" | "email" | "role" | "mustChangePassword">) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, mustChangePassword: user.mustChangePassword };
}

export interface ClientInfo {
  ip: string;
  userAgent?: string;
}

/** Hash of a random string, made once at startup: comparing against it keeps unknown-email logins as slow as real ones. */
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString("hex"), 10);

export function buildAuthService(app: FastifyInstance) {
  async function issueTokens(user: Pick<User, "id" | "role">) {
    const accessToken = app.jwt.sign({ sub: user.id, role: user.role }, { expiresIn: env.ACCESS_TOKEN_TTL });
    const rawRefreshToken = crypto.randomBytes(40).toString("hex");
    await refreshTokenRepository.create({
      userId: user.id,
      tokenHash: hashToken(rawRefreshToken),
      expiresAt: new Date(Date.now() + ttlToMs(env.REFRESH_TOKEN_TTL)),
    });
    return { accessToken, refreshToken: rawRefreshToken };
  }

  return {
    /**
     * - 5 failures per email+IP in 15 min -> 429 (checked before touching the password).
     * - Unknown email and wrong password give the same 401 and take the same time.
     * - A deactivated account is only reported after a correct password, so the
     *   message never reveals whether an email exists.
     */
    async login(email: string, password: string, client: ClientInfo) {
      const retryAfter = loginThrottle.retryAfterSeconds(email, client.ip);
      if (retryAfter > 0) {
        throw new AppError(429, "Too many failed login attempts", { code: "TOO_MANY_ATTEMPTS", retryAfterSeconds: retryAfter });
      }

      const user = await userRepository.findByEmail(email);
      const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
      const ctx: AuditContext = { actorId: user?.id ?? null, actorEmail: user?.email ?? email.slice(0, 120), ip: client.ip, userAgent: client.userAgent };

      if (!user || !valid) {
        const attempts = loginThrottle.fail(email, client.ip);
        await audit.log({ action: AUDIT_ACTIONS.loginFailed, entityType: user ? "user" : undefined, entityId: user?.id, metadata: { attempts } }, ctx);
        throw new AppError(401, "Invalid credentials");
      }
      if (!user.isActive) {
        await audit.log({ action: AUDIT_ACTIONS.loginFailed, entityType: "user", entityId: user.id, metadata: { reason: "deactivated" } }, ctx);
        throw new AppError(403, "This account is deactivated", { code: "ACCOUNT_DISABLED" });
      }

      loginThrottle.clear(email, client.ip);
      const tokens = await issueTokens(user);
      await userRepository.touchLogin(user.id);
      await audit.log({ action: AUDIT_ACTIONS.loginSucceeded, entityType: "user", entityId: user.id }, ctx);

      return { ...tokens, user: presentUser(user) };
    },

    async refresh(userId: string, rawRefreshToken: string) {
      const tokenHash = hashToken(rawRefreshToken);
      const stored = await refreshTokenRepository.findValidByUserAndHash(userId, tokenHash);
      if (!stored) throw new AppError(401, "Invalid or expired refresh token");

      // Rotate: revoke the used one, issue a new pair
      await refreshTokenRepository.revoke(stored.id);

      const user = await userRepository.findById(userId);
      if (!user) throw new AppError(401, "User not found");
      if (!user.isActive) throw new AppError(401, "This account is deactivated", { code: "ACCOUNT_DISABLED" });

      return issueTokens(user);
    },

    async me(userId: string) {
      const user = await userRepository.findById(userId);
      if (!user) throw new AppError(401, "User not found");
      return { ...presentUser(user), phone: user.phone, lastLoginAt: user.lastLoginAt };
    },

    async logout(requester: RequestUser) {
      await refreshTokenRepository.revokeAllForUser(requester.sub);
      await audit.log({ action: AUDIT_ACTIONS.logout, entityType: "user", entityId: requester.sub }, audit.context(requester));
    },

    /**
     * Requires the current password, enforces the policy (zod: length; here:
     * not the same as before), clears the forced-change flag and signs out every
     * other session. The caller gets a fresh token pair for this session.
     */
    async changePassword(requester: RequestUser, currentPassword: string, newPassword: string) {
      const user = await userRepository.findById(requester.sub);
      if (!user) throw new AppError(401, "User not found");
      if (!(await verifyPassword(currentPassword, user.passwordHash))) {
        throw new AppError(400, "The current password is not correct", { code: "WRONG_CURRENT_PASSWORD" });
      }
      if (await verifyPassword(newPassword, user.passwordHash)) {
        throw new AppError(400, "The new password must be different from the current one", { code: "PASSWORD_REUSED" });
      }

      const passwordHash = await hashPassword(newPassword);
      const revoked = await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: user.id }, data: { passwordHash, mustChangePassword: false } });
        const { count } = await tx.refreshToken.updateMany({ where: { userId: user.id, revoked: false }, data: { revoked: true } });
        await audit.record(tx, { action: AUDIT_ACTIONS.passwordChanged, entityType: "user", entityId: user.id, metadata: { revokedSessions: count } }, audit.context(requester));
        return count;
      });
      userStatus.invalidate(user.id);

      const tokens = await issueTokens(user);
      return { ...tokens, revokedSessions: revoked, user: presentUser({ ...user, mustChangePassword: false }) };
    },

    /** Kept for compatibility (POST /auth/register); new screens use POST /users. */
    async register(data: { name: string; email: string; password: string; role: "ADMIN" | "RESIDENT_ENGINEER" }, requester: RequestUser) {
      const existing = await userRepository.findByEmail(data.email);
      if (existing) throw new AppError(409, "Email already registered");

      const passwordHash = await hashPassword(data.password);
      const user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: { name: data.name, email: data.email, passwordHash, role: data.role, createdById: requester.sub },
        });
        await audit.record(
          tx,
          { action: AUDIT_ACTIONS.userCreated, entityType: "user", entityId: created.id, metadata: { name: created.name, email: created.email, role: created.role } },
          audit.context(requester)
        );
        return created;
      });

      return { id: user.id, name: user.name, email: user.email, role: user.role };
    },
  };
}
