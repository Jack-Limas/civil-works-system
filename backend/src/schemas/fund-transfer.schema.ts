import { z } from "zod";
import { PAYMENT_METHODS } from "./expense.schema";

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const optional = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(emptyToUndefined, schema.optional());

export const createFundTransferSchema = z.object({
  residentId: z.string().uuid(),
  projectId: optional(z.string().uuid()),
  amount: z.coerce.number().positive().max(999_999_999_999),
  date: optional(z.coerce.date()),
  method: optional(z.enum(PAYMENT_METHODS)),
  notes: optional(z.string().trim().max(500)),
  // createdById is taken from the session
});

export const listFundTransfersQuerySchema = z.object({
  residentId: optional(z.string().uuid()),
  projectId: optional(z.string().uuid()),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateFundTransferInput = z.infer<typeof createFundTransferSchema>;
export type ListFundTransfersQuery = z.infer<typeof listFundTransfersQuerySchema>;
