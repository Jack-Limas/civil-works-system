import { prisma } from "../config/prisma";
import { Role } from "../types/auth";

export interface UserStatus {
  email: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
}

/** Short enough that a change made elsewhere is picked up quickly, long enough to skip most lookups. */
const TTL_MS = 30_000;

/**
 * Per-request account status (active, forced password change) behind a small
 * in-memory cache keyed by user id. A Map gives O(1) lookups and lets the
 * user, auth and settings services drop one entry the moment they change it,
 * so deactivating a user locks them out immediately instead of when their
 * access token expires. Enough for a single API instance.
 */
const cache = new Map<string, { status: UserStatus | null; expiresAt: number }>();

export const userStatus = {
  async get(userId: string): Promise<UserStatus | null> {
    const hit = cache.get(userId);
    if (hit && hit.expiresAt > Date.now()) return hit.status;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, role: true, isActive: true, mustChangePassword: true },
    });
    cache.set(userId, { status: user, expiresAt: Date.now() + TTL_MS });
    return user;
  },

  invalidate(userId: string) {
    cache.delete(userId);
  },
};
