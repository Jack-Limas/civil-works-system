import { z } from "zod";

export const createActivitySchema = z.object({
  projectId: z.string().uuid(),
  date: z.coerce.date(),
  name: z.string().min(3),
  description: z.string().optional(),
  progressPercentage: z.number().min(0).max(100),
  // responsibleId is intentionally absent: the server takes it from the session
  observations: z.string().optional(),
});

export const listActivitiesQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type ListActivitiesQuery = z.infer<typeof listActivitiesQuerySchema>;