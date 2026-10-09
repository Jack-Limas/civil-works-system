import { z } from "zod";
import { isValidDateKey } from "../utils/business-time";

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const optional = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(emptyToUndefined, schema.optional());
const dateKey = z.string().refine(isValidDateKey, "Expected a date as YYYY-MM-DD");

export const AUDIT_ENTITY_TYPES = ["user", "settings", "expense", "transfer", "project", "material", "field_report", "incident", "worker"] as const;

const filters = {
  actorId: optional(z.string().uuid()),
  /** Exact action code, or a module prefix such as "user." */
  action: optional(z.string().max(60).regex(/^[a-z_]+(\.[a-z_]*)?$/)),
  entityType: optional(z.enum(AUDIT_ENTITY_TYPES)),
  entityId: optional(z.string().uuid()),
  /** Business dates (America/Bogota), inclusive */
  from: optional(dateKey),
  to: optional(dateKey),
};

export const listAuditLogsQuerySchema = z
  .object({
    ...filters,
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(25),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, { message: "from must be before to", path: ["from"] });

export const exportAuditLogsQuerySchema = z
  .object(filters)
  .refine((q) => !q.from || !q.to || q.from <= q.to, { message: "from must be before to", path: ["from"] });

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
export type AuditLogFilters = z.infer<typeof exportAuditLogsQuerySchema>;
