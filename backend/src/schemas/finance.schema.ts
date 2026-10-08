import { z } from "zod";

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

export const cashflowQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).default(6),
  projectId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  supplierId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CashflowQuery = z.infer<typeof cashflowQuerySchema>;
