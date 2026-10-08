import { z } from "zod";

export const MATERIAL_CATEGORIES = [
  "CEMENT_CONCRETE",
  "STEEL",
  "AGGREGATES",
  "MASONRY",
  "WOOD",
  "ELECTRICAL",
  "PLUMBING",
  "FINISHES",
  "TOOLS_EQUIPMENT",
  "OTHER",
] as const;

export const MATERIAL_STATUSES = ["OUT", "CRITICAL", "WARNING", "OK"] as const;
export type MaterialStatus = (typeof MATERIAL_STATUSES)[number];

/** Multipart/query values arrive as strings; empty strings mean "not provided". */
const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const optional = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(emptyToUndefined, schema.optional());

export const createMaterialSchema = z.object({
  name: z.string().trim().min(2).max(120),
  unit: z.string().trim().min(1).max(30),
  // Ignored for residents (they may only set name and unit)
  stockMinimum: z.number().min(0).max(1_000_000_000).default(0),
  category: z.enum(MATERIAL_CATEGORIES).optional(),
});

/** Only these fields are editable; stockAvailable changes exclusively through movements. */
export const updateMaterialSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    unit: z.string().trim().min(1).max(30),
    stockMinimum: z.number().min(0).max(1_000_000_000),
    category: z.enum(MATERIAL_CATEGORIES).nullable(),
  })
  .partial()
  .strict();

export const createMovementSchema = z.object({
  materialId: z.string().uuid(),
  type: z.enum(["IN", "OUT"]),
  quantity: z.number().positive().max(1_000_000_000),
  projectId: optional(z.string().uuid()),
  expenseId: optional(z.string().uuid()),
  supplierId: optional(z.string().uuid()),
  unitCost: optional(z.number().positive().max(999_999_999_999)),
  date: optional(z.coerce.date()),
  notes: optional(z.string().trim().max(500)),
  // registeredById is never accepted: the server takes it from the session
});

export const listMaterialsQuerySchema = z.object({
  search: optional(z.string().trim().max(120)),
  /** A category, or "NONE" for materials without category */
  category: optional(z.union([z.enum(MATERIAL_CATEGORIES), z.literal("NONE")])),
  status: optional(z.enum(MATERIAL_STATUSES)),
  sort: z.enum(["name", "coverage", "stock", "status"]).default("name"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

export const materialDetailQuerySchema = z.object({
  days: z.coerce.number().int().refine((d) => d === 30 || d === 90, "days must be 30 or 90").default(30),
});

export const listMovementsQuerySchema = z.object({
  materialId: optional(z.string().uuid()),
  projectId: optional(z.string().uuid()),
  type: optional(z.enum(["IN", "OUT"])),
  registeredById: optional(z.string().uuid()),
  from: optional(z.coerce.date()),
  to: optional(z.coerce.date()),
  /** Only movements linked to a REJECTED expense */
  warnings: optional(z.enum(["true", "false"])).transform((v) => v === "true"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;
export type CreateMovementInput = z.infer<typeof createMovementSchema>;
export type ListMaterialsQuery = z.infer<typeof listMaterialsQuerySchema>;
export type ListMovementsQuery = z.infer<typeof listMovementsQuerySchema>;
