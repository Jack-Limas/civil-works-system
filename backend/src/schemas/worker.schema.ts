import { z } from "zod";

export const createWorkerSchema = z.object({
  name: z.string().min(2),
  documentId: z.string().min(5),
  position: z.string().min(2),
  projectId: z.string().uuid().optional(),
});

export const updateWorkerSchema = z.object({
  position: z.string().min(2).optional(),
  projectId: z.string().uuid().nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const listWorkersQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateWorkerInput = z.infer<typeof createWorkerSchema>;
export type UpdateWorkerInput = z.infer<typeof updateWorkerSchema>;
export type ListWorkersQuery = z.infer<typeof listWorkersQuerySchema>;