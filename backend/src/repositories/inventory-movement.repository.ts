import { prisma } from "../config/prisma";
import { CreateMovementInput } from "../schemas/material.schema";

export const inventoryMovementRepository = {
  create(data: CreateMovementInput) {
    return prisma.inventoryMovement.create({ data });
  },

  findByMaterial(materialId: string) {
    return prisma.inventoryMovement.findMany({
      where: { materialId },
      orderBy: { date: "desc" },
      take: 50,
    });
  },
};