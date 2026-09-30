import { z } from "zod";

export const createIncidentSchema = z.object({
  projectId: z.string().uuid(),
  date: z.coerce.date().optional(),
  type: z.enum([
    "MATERIAL_SHORTAGE",
    "ACTIVITY_DELAY",
    "WEATHER",
    "EQUIPMENT_DAMAGE",
    "STAFF_ISSUE",
    "ACTIVITY_CHANGE",
    "OTHER",
  ]),
  description: z.string().min(5),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
});

export const updateIncidentSchema = z.object({
  status: z.enum(["OPEN", "IN_REVIEW", "RESOLVED"]),
});

export const listIncidentsQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.enum(["OPEN", "IN_REVIEW", "RESOLVED"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
export type UpdateIncidentInput = z.infer<typeof updateIncidentSchema>;
export type ListIncidentsQuery = z.infer<typeof listIncidentsQuerySchema>;