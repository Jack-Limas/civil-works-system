import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { userPublicSelect, userRepository } from "../repositories/user.repository";
import { auditLogRepository } from "../repositories/audit-log.repository";
import { CreateUserInput, ListUsersQuery, UpdateUserInput } from "../schemas/user.schema";
import { AppError } from "../utils/app-error";
import { generateTemporaryPassword, hashPassword } from "../utils/password";
import { Role, RequestUser } from "../types/auth";
import { audit, AUDIT_ACTIONS, diff } from "./audit.service";
import { userStatus } from "./user-status.service";

const RECENT_ACTIVITY = 15;

function selfAction(): never {
  throw new AppError(409, "You cannot do this on your own account", { code: "SELF_ACTION" });
}
function lastAdmin(): never {
  throw new AppError(409, "There must be at least one active administrator", { code: "LAST_ADMIN" });
}

/** Signs a user out everywhere (refresh tokens) inside the caller's transaction. */
async function revokeSessions(tx: Prisma.TransactionClient, userId: string) {
  const { count } = await tx.refreshToken.updateMany({ where: { userId, revoked: false }, data: { revoked: true } });
  return count;
}

export const userService = {
  /** Compatibility: plain list used by pickers (e.g. residents for fund transfers). */
  list(role?: Role) {
    return userRepository.findAllPublic(role);
  },

  async search(query: ListUsersQuery) {
    const where: Prisma.UserWhereInput = {
      ...(query.role && { role: query.role }),
      ...(query.status && { isActive: query.status === "active" }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { email: { contains: query.search, mode: "insensitive" } },
        ],
      }),
    };
    const skip = (query.page - 1) * query.limit;
    const [[rows, total], summary] = await Promise.all([userRepository.list(where, skip, query.limit), this.summary()]);

    return {
      data: rows.map(({ _count, ...user }) => ({ ...user, projectsInCharge: _count.projectsInCharge })),
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
      summary,
    };
  },

  async summary() {
    const { byRoleAndStatus, pendingPasswordChange, neverLoggedIn } = await userRepository.summary();
    const count = (filter: (g: (typeof byRoleAndStatus)[number]) => boolean) =>
      byRoleAndStatus.filter(filter).reduce((sum, g) => sum + (g._count as { _all: number })._all, 0);
    return {
      total: count(() => true),
      active: count((g) => g.isActive),
      inactive: count((g) => !g.isActive),
      admins: count((g) => g.isActive && g.role === "ADMIN"),
      residents: count((g) => g.isActive && g.role === "RESIDENT_ENGINEER"),
      pendingPasswordChange,
      neverLoggedIn,
    };
  },

  async detail(id: string) {
    const user = await userRepository.findDetail(id);
    if (!user) throw new AppError(404, "User not found");
    const recentActivity = await auditLogRepository.forUser(id, RECENT_ACTIVITY);
    return { ...user, recentActivity };
  },

  /**
   * Creates the account with a random temporary password and returns it ONCE
   * in this response. Only its bcrypt hash is stored; the audit event never
   * contains it. The user must change it on first login.
   */
  async create(input: CreateUserInput, requester: RequestUser) {
    if (await userRepository.findByEmail(input.email)) {
      throw new AppError(409, "Email already registered", { code: "EMAIL_TAKEN" });
    }
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    try {
      const user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: { ...input, passwordHash, mustChangePassword: true, createdById: requester.sub },
          select: userPublicSelect,
        });
        await audit.record(
          tx,
          { action: AUDIT_ACTIONS.userCreated, entityType: "user", entityId: created.id, metadata: { name: created.name, email: created.email, role: created.role, phone: created.phone } },
          audit.context(requester)
        );
        return created;
      });
      return { user, temporaryPassword };
    } catch (error) {
      // Two admins creating the same email at once: the unique index decides
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError(409, "Email already registered", { code: "EMAIL_TAKEN" });
      }
      throw error;
    }
  },

  /** Name, phone and role. An admin cannot change their own role or demote the last active admin. */
  async update(id: string, input: UpdateUserInput, requester: RequestUser) {
    const existing = await userRepository.findById(id);
    if (!existing) throw new AppError(404, "User not found");

    if (input.role && input.role !== existing.role) {
      if (id === requester.sub) selfAction();
      if (existing.role === "ADMIN" && existing.isActive && (await userRepository.countActiveAdmins()) <= 1) lastAdmin();
    }

    const changes = diff(existing, input, ["name", "phone", "role"]);
    if (!changes) return userRepository.findDetail(id);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: input });
      await audit.record(tx, { action: AUDIT_ACTIONS.userUpdated, entityType: "user", entityId: id, metadata: changes }, audit.context(requester));
    });
    userStatus.invalidate(id);
    return userRepository.findDetail(id);
  },

  /** Blocks login and revokes every session. Not on yourself, not on the last active admin. */
  async deactivate(id: string, requester: RequestUser) {
    if (id === requester.sub) selfAction();
    const existing = await userRepository.findById(id);
    if (!existing) throw new AppError(404, "User not found");
    if (!existing.isActive) throw new AppError(409, "User is already inactive", { code: "ALREADY_INACTIVE" });
    if (existing.role === "ADMIN" && (await userRepository.countActiveAdmins()) <= 1) lastAdmin();

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { isActive: false, deactivatedAt: new Date() } });
      const revokedSessions = await revokeSessions(tx, id);
      await audit.record(
        tx,
        { action: AUDIT_ACTIONS.userDeactivated, entityType: "user", entityId: id, metadata: { name: existing.name, email: existing.email, revokedSessions } },
        audit.context(requester)
      );
    });
    userStatus.invalidate(id);
    return userRepository.findDetail(id);
  },

  async activate(id: string, requester: RequestUser) {
    const existing = await userRepository.findById(id);
    if (!existing) throw new AppError(404, "User not found");
    if (existing.isActive) throw new AppError(409, "User is already active", { code: "ALREADY_ACTIVE" });

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { isActive: true, deactivatedAt: null } });
      await audit.record(
        tx,
        { action: AUDIT_ACTIONS.userActivated, entityType: "user", entityId: id, metadata: { name: existing.name, email: existing.email } },
        audit.context(requester)
      );
    });
    userStatus.invalidate(id);
    return userRepository.findDetail(id);
  },

  /**
   * New temporary password returned once; forces a change and signs the user
   * out. Admins change their own password from their profile instead.
   */
  async resetPassword(id: string, requester: RequestUser) {
    if (id === requester.sub) selfAction();
    const existing = await userRepository.findById(id);
    if (!existing) throw new AppError(404, "User not found");

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { passwordHash, mustChangePassword: true } });
      const revokedSessions = await revokeSessions(tx, id);
      await audit.record(
        tx,
        { action: AUDIT_ACTIONS.passwordReset, entityType: "user", entityId: id, metadata: { name: existing.name, email: existing.email, revokedSessions } },
        audit.context(requester)
      );
    });
    userStatus.invalidate(id);
    return { temporaryPassword };
  },
};
