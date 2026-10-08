import { prisma } from "../config/prisma";
import { Role } from "@prisma/client";

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
};