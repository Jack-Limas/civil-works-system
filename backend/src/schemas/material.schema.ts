import { z } from "zod";

export const createMaterialSchema = z.object({
  name: z.string().min(2),
  unit: z.string().min(1),
  stockMinimum: z.number().min(0).default(0),
});

export const createMovementSchema = z.object({
  materialId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  type: z.enum(["IN", "OUT"]),
  quantity: z.number().positive(),
  notes: z.string().optional(),
});

export const listMaterialsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type CreateMovementInput = z.infer<typeof createMovementSchema>;
export type ListMaterialsQuery = z.infer<typeof listMaterialsQuerySchema>;