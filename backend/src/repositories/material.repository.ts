import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

export const materialRepository = {
  /**
   * Every material, unpaginated. The catalog is small (hundreds of rows) and
   * status/coverage are computed per material, so filtering and sorting by
   * those derived values happen in memory after one query.
   */
  findAll() {
    return prisma.material.findMany({ orderBy: { name: "asc" } });
  },

  /** Kept for internal callers that only need raw rows. */
  findAllRaw() {
    return prisma.material.findMany();
  },

  findById(id: string) {
    return prisma.material.findUnique({ where: { id } });
  },

  findByNameInsensitive(name: string) {
    return prisma.material.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  },

  create(data: Prisma.MaterialCreateInput) {
    return prisma.material.create({ data });
  },

  update(id: string, data: Prisma.MaterialUpdateInput) {
    return prisma.material.update({ where: { id }, data });
  },
};
