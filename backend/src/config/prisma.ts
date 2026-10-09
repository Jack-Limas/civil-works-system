import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

/**
 * Options for interactive transactions that lock a material row (stock
 * movements). Concurrent movements on the same material queue on that lock;
 * with the database ~250 ms away, Prisma's 5 s default expired the last ones
 * in the queue. These bounds still fail fast enough for a user waiting.
 */
export const STOCK_TX_OPTIONS = { maxWait: 10_000, timeout: 20_000 } as const;
