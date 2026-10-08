import { z } from "zod";

export const EXPENSE_CATEGORIES = ["MATERIALS", "LABOR", "EQUIPMENT", "TRANSPORT", "FUEL", "OTHER"] as const;

/** Optional free text: trimmed, and empty strings become undefined. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const createSupplierSchema = z.object({
  name: z.string().trim().min(2).max(120),
  nit: optionalText(30),
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  phone: optionalText(30),
  email: z
    .string()
    .trim()
    .email()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  notes: optionalText(500),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export const listSuppliersQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type ListSuppliersQuery = z.infer<typeof listSuppliersQuerySchema>;
