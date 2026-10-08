import { prisma } from "../config/prisma";
import { CreateMovementInput } from "../schemas/material.schema";

export const inventoryMovementRepository = {
  create(data: CreateMovementInput) {
    return prisma.inventoryMovement.create({ data });
  },

  /**
   * Adjusts stock and records the movement atomically. OUT movements use a
   * conditional decrement (stockAvailable >= quantity) inside the same UPDATE,
   * so two concurrent requests can never push the stock below zero.
   * Returns null when there is not enough stock.
   */
  registerAtomic(data: CreateMovementInput) {
    return prisma.$transaction(async (tx) => {
      if (data.type === "OUT") {
        const { count } = await tx.material.updateMany({
          where: { id: data.materialId, stockAvailable: { gte: data.quantity } },
          data: { stockAvailable: { decrement: data.quantity } },
        });
        if (count === 0) return null;
      } else {
        await tx.material.update({
          where: { id: data.materialId },
          data: { stockAvailable: { increment: data.quantity } },
        });
      }

      const movement = await tx.inventoryMovement.create({ data });
      const material = await tx.material.findUniqueOrThrow({ where: { id: data.materialId } });
      return { movement, material };
    });
  },

  findByMaterial(materialId: string) {
    return prisma.inventoryMovement.findMany({
      where: { materialId },
      orderBy: { date: "desc" },
      take: 50,
    });
  },
};