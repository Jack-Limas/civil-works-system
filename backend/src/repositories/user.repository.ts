import { Prisma, Role } from "@prisma/client";
import { prisma } from "../config/prisma";

/** Never includes passwordHash: this is what any API response may carry. */
export const userPublicSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  isActive: true,
  mustChangePassword: true,
  lastLoginAt: true,
  deactivatedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export const userRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },
  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },
  findAllPublic(role?: Role) {
    return prisma.user.findMany({
      where: { ...(role && { role }) },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { name: "asc" },
    });
  },
  findPublicByIds(ids: string[]) {
    return prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
  },
  create(data: { name: string; email: string; passwordHash: string; role: Role }) {
    return prisma.user.create({ data });
  },
  touchLogin(id: string) {
    return prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } });
  },

  // ---------- users module ----------

  list(where: Prisma.UserWhereInput, skip: number, take: number) {
    return prisma.$transaction([
      prisma.user.findMany({
        where,
        select: { ...userPublicSelect, _count: { select: { projectsInCharge: true } } },
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
        skip,
        take,
      }),
      prisma.user.count({ where }),
    ]);
  },

  /** KPI counts in one round trip (groupBy instead of one query per KPI). */
  async summary() {
    const [byRoleAndStatus, pendingPasswordChange, neverLoggedIn] = await prisma.$transaction([
      prisma.user.groupBy({ by: ["role", "isActive"], _count: { _all: true }, orderBy: { role: "asc" } }),
      prisma.user.count({ where: { mustChangePassword: true, isActive: true } }),
      prisma.user.count({ where: { lastLoginAt: null, isActive: true } }),
    ]);
    return { byRoleAndStatus, pendingPasswordChange, neverLoggedIn };
  },

  findDetail(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        ...userPublicSelect,
        createdBy: { select: { id: true, name: true } },
        projectsInCharge: {
          select: { id: true, name: true, status: true, municipality: true, progressPercentage: true },
          orderBy: { name: "asc" },
        },
      },
    });
  },

  countActiveAdmins() {
    return prisma.user.count({ where: { role: "ADMIN", isActive: true } });
  },
};
