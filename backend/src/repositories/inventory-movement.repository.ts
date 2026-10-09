import { Prisma } from "@prisma/client";
import { prisma, STOCK_TX_OPTIONS } from "../config/prisma";

type Db = Prisma.TransactionClient | typeof prisma;

/** Relations shown in the ledger. Costs are stripped later for residents. */
export const movementInclude = {
  material: { select: { id: true, name: true, unit: true } },
  project: { select: { id: true, name: true } },
  registeredBy: { select: { id: true, name: true, role: true } },
  supplier: { select: { id: true, name: true } },
  expense: { select: { id: true, status: true, description: true, amount: true, category: true } },
} satisfies Prisma.InventoryMovementInclude;

export const inventoryMovementRepository = {
  /**
   * Adjusts stock and records the movement atomically. OUT movements use a
   * conditional decrement (stockAvailable >= quantity) inside the same UPDATE,
   * so concurrent requests can never push the stock below zero.
   * Pass `db` to join an outer transaction (e.g. expense + inventory entry).
   * Returns null when there is not enough stock.
   */
  async registerAtomic(data: Prisma.InventoryMovementUncheckedCreateInput, db?: Prisma.TransactionClient) {
    const run = async (tx: Prisma.TransactionClient) => {
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

      const movement = await tx.inventoryMovement.create({ data, include: movementInclude });
      const material = await tx.material.findUniqueOrThrow({ where: { id: data.materialId } });
      return { movement, material };
    };
    return db ? run(db) : prisma.$transaction(run, STOCK_TX_OPTIONS);
  },

  findMany(where: Prisma.InventoryMovementWhereInput, skip: number, take: number) {
    return Promise.all([
      prisma.inventoryMovement.findMany({
        where,
        skip,
        take,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        include: movementInclude,
      }),
      prisma.inventoryMovement.count({ where }),
    ]);
  },

  /** OUT movements since a date: the raw input of the consumption analysis. */
  consumptionSince(since: Date, materialId?: string) {
    return prisma.inventoryMovement.findMany({
      where: { type: "OUT", date: { gte: since }, ...(materialId && { materialId }) },
      select: { materialId: true, projectId: true, quantity: true },
    });
  },

  /** Latest movement of each material (one query thanks to DISTINCT ON). */
  lastPerMaterial() {
    return prisma.inventoryMovement.findMany({
      distinct: ["materialId"],
      orderBy: [{ materialId: "asc" }, { date: "desc" }],
      select: { materialId: true, type: true, date: true, quantity: true },
    });
  },

  /** Latest known unit cost of each material. */
  lastCostPerMaterial() {
    return prisma.inventoryMovement.findMany({
      where: { unitCost: { not: null } },
      distinct: ["materialId"],
      orderBy: [{ materialId: "asc" }, { date: "desc" }],
      select: { materialId: true, unitCost: true, date: true },
    });
  },

  countSince(since: Date) {
    return prisma.inventoryMovement.count({ where: { date: { gte: since } } });
  },

  /** Movements of one material since a date, oldest first (for stock reconstruction). */
  forMaterialSince(materialId: string, since: Date) {
    return prisma.inventoryMovement.findMany({
      where: { materialId, date: { gte: since } },
      orderBy: { date: "asc" },
      select: { type: true, quantity: true, date: true },
    });
  },

  latestForMaterial(materialId: string, take: number, db: Db = prisma) {
    return db.inventoryMovement.findMany({
      where: { materialId },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take,
      include: movementInclude,
    });
  },
};
