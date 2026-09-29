import { prisma } from "../config/prisma";

export const refreshTokenRepository = {
  create(data: { userId: string; tokenHash: string; expiresAt: Date }) {
    return prisma.refreshToken.create({ data });
  },
  findValidByUserAndHash(userId: string, tokenHash: string) {
    return prisma.refreshToken.findFirst({
      where: { userId, tokenHash, revoked: false, expiresAt: { gt: new Date() } },
    });
  },
  revoke(id: string) {
    return prisma.refreshToken.update({ where: { id }, data: { revoked: true } });
  },
  revokeAllForUser(userId: string) {
    return prisma.refreshToken.updateMany({ where: { userId }, data: { revoked: true } });
  },
};