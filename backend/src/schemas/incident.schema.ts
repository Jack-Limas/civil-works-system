import { z } from "zod";
import { isValidDateKey } from "../utils/business-time";

export const INCIDENT_TYPES = [
  "MATERIAL_SHORTAGE",
  "ACTIVITY_DELAY",
  "WEATHER",
  "EQUIPMENT_DAMAGE",
  "STAFF_ISSUE",
  "ACTIVITY_CHANGE",
  "OTHER",
] as const;
export const INCIDENT_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
/** IN_REVIEW is shown as "In progress" (renaming the enum value would not be additive). */
export const INCIDENT_STATUSES = ["OPEN", "IN_REVIEW", "RESOLVED"] as const;
export const INCIDENT_SORTS = ["priority", "date"] as const;

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const optional = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(emptyToUndefined, schema.optional());
const dateKey = z.string().refine(isValidDateKey, "Expected a date as YYYY-MM-DD");

export const createIncidentSchema = z.object({
  projectId: z.string().uuid(),
  /** When it happened (the event date); defaults to now */
  date: z.coerce.date().optional(),
  type: z.enum(INCIDENT_TYPES),
  description: z.string().trim().min(5).max(2000),
  priority: z.enum(INCIDENT_PRIORITIES).default("MEDIUM"),
});

/**
 * Editable details. `status` is still accepted for older clients and is
 * routed through the same transition rules as POST /incidents/:id/status.
 */
export const updateIncidentSchema = z
  .object({
    type: z.enum(INCIDENT_TYPES).optional(),
    description: z.string().trim().min(5).max(2000).optional(),
    priority: z.enum(INCIDENT_PRIORITIES).optional(),
    date: z.coerce.date().optional(),
    status: z.enum(INCIDENT_STATUSES).optional(),
  })
  .strict();

export const changeIncidentStatusSchema = z
  .object({
    status: z.enum(INCIDENT_STATUSES),
    note: optional(z.string().trim().max(1000)),
  })
  // A resolution always says how it was solved
  .refine((v) => v.status !== "RESOLVED" || (v.note !== undefined && v.note.length >= 3), {
    message: "A resolution note is required",
    path: ["note"],
  });

export const listIncidentsQuerySchema = z
  .object({
    projectId: optional(z.string().uuid()),
    status: optional(z.enum(INCIDENT_STATUSES)),
    /** "active" = OPEN or IN_REVIEW */
    state: optional(z.enum(["active"])),
    priority: optional(z.enum(INCIDENT_PRIORITIES)),
    type: optional(z.enum(INCIDENT_TYPES)),
    search: optional(z.string().trim().max(100)),
    /** Event dates (America/Bogota), inclusive */
    from: optional(dateKey),
    to: optional(dateKey),
    reportedById: optional(z.string().uuid()),
    sort: z.enum(INCIDENT_SORTS).default("priority"),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, { message: "from must be before to", path: ["from"] });

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
export type UpdateIncidentInput = z.infer<typeof updateIncidentSchema>;
export type ChangeIncidentStatusInput = z.infer<typeof changeIncidentStatusSchema>;
export type ListIncidentsQuery = z.infer<typeof listIncidentsQuerySchema>;
