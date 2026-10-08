import bcrypt from "bcrypt";
import crypto from "crypto";
import { FastifyInstance } from "fastify";
import { userRepository } from "../repositories/user.repository";
import { refreshTokenRepository } from "../repositories/refresh-token.repository";
import { env } from "../config/env";
import { AppError } from "../utils/app-error";

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

export function buildAuthService(app: FastifyInstance) {
  return {
    async login(email: string, password: string) {
      const user = await userRepository.findByEmail(email);
      if (!user) throw new AppError(401, "Invalid credentials");

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) throw new AppError(401, "Invalid credentials");

      const accessToken = app.jwt.sign(
        { sub: user.id, role: user.role },
        { expiresIn: env.ACCESS_TOKEN_TTL }
      );

      const rawRefreshToken = crypto.randomBytes(40).toString("hex");
      const expiresAt = new Date(Date.now() + ttlToMs(env.REFRESH_TOKEN_TTL));

      await refreshTokenRepository.create({
        userId: user.id,
        tokenHash: hashToken(rawRefreshToken),
        expiresAt,
      });

      return {
        accessToken,
        refreshToken: rawRefreshToken,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      };
    },

    async refresh(userId: string, rawRefreshToken: string) {
      const tokenHash = hashToken(rawRefreshToken);
      const stored = await refreshTokenRepository.findValidByUserAndHash(userId, tokenHash);
      if (!stored) throw new AppError(401, "Invalid or expired refresh token");

      // Rotate: revoke the used one, issue a new pair
      await refreshTokenRepository.revoke(stored.id);

      const user = await userRepository.findById(userId);
      if (!user) throw new AppError(401, "User not found");

      const accessToken = app.jwt.sign(
        { sub: user.id, role: user.role },
        { expiresIn: env.ACCESS_TOKEN_TTL }
      );

      const newRawRefreshToken = crypto.randomBytes(40).toString("hex");
      const expiresAt = new Date(Date.now() + ttlToMs(env.REFRESH_TOKEN_TTL));

      await refreshTokenRepository.create({
        userId: user.id,
        tokenHash: hashToken(newRawRefreshToken),
        expiresAt,
      });

      return { accessToken, refreshToken: newRawRefreshToken };
    },

    async me(userId: string) {
      const user = await userRepository.findById(userId);
      if (!user) throw new AppError(401, "User not found");
      return { id: user.id, name: user.name, email: user.email, role: user.role };
    },

    async logout(userId: string) {
      await refreshTokenRepository.revokeAllForUser(userId);
    },

    async register(data: { name: string; email: string; password: string; role: "ADMIN" | "RESIDENT_ENGINEER" }) {
      const existing = await userRepository.findByEmail(data.email);
      if (existing) throw new AppError(409, "Email already registered");

      const passwordHash = await bcrypt.hash(data.password, 10);
      const user = await userRepository.create({
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
      });

      return { id: user.id, name: user.name, email: user.email, role: user.role };
    },
  };
}