import { prisma } from "../config/prisma";
import { CreateMaterialInput } from "../schemas/material.schema";

export const materialRepository = {
  findMany(skip: number, take: number) {
    return Promise.all([
      prisma.material.findMany({ skip, take, orderBy: { name: "asc" } }),
      prisma.material.count(),
    ]);
  },

  findAllRaw() {
    // Sin paginación: usado para cálculos internos (alertas, reportes), no para listar en UI
    return prisma.material.findMany();
  },

  findById(id: string) {
    return prisma.material.findUnique({ where: { id } });
  },

  create(data: CreateMaterialInput) {
    return prisma.material.create({ data });
  },
};