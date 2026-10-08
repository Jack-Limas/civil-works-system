import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(3),
  type: z.enum([
    "RESIDENTIAL_BUILDING",
    "COMMERCIAL_BUILDING",
    "ROAD",
    "BRIDGE",
    "SCHOOL",
    "HEALTH_CENTER",
    "WAREHOUSE",
    "REMODELING",
    "STADIUM",
    "POOL",
    "SYNTHETIC_FIELD",
    "RETAINING_WALL",
    "PRIVATE_WORK",
    "OTHER",
  ]),
  municipality: z.string().min(2),
  address: z.string().optional(),
  startDate: z.coerce.date(),
  estimatedEndDate: z.coerce.date(),
  budget: z.number().positive(),
  responsibleId: z.string().uuid(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(3).optional(),
  status: z.enum(["PLANNED", "IN_PROGRESS", "SUSPENDED", "FINISHED"]).optional(),
  progressPercentage: z.number().min(0).max(100).optional(),
  budget: z.number().positive().optional(),
  estimatedEndDate: z.coerce.date().optional(),
});

export const listProjectsQuerySchema = z.object({
  status: z.enum(["PLANNED", "IN_PROGRESS", "SUSPENDED", "FINISHED"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;