import { z } from "zod";

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const optional = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(emptyToUndefined, schema.optional());
/** "" from a cleared form field means "remove" for nullable columns. */
const nullable = <T extends z.ZodTypeAny>(schema: T) => z.preprocess((v) => (v === "" ? null : v), schema.nullable().optional());

export const WORKER_STATUSES = ["ACTIVE", "INACTIVE"] as const;

/** Cédula / CE / PPT as written on the card: letters, digits, dots and dashes. */
const documentId = z
  .string()
  .trim()
  .min(5)
  .max(20)
  .regex(/^[A-Za-z0-9.-]+$/, "Invalid document number");
const phone = z
  .string()
  .trim()
  .max(30)
  .regex(/^[\d\s+()-]{7,30}$/, "Invalid phone number");

export const createWorkerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  documentId,
  /** Trade / role on site (oficio) */
  position: z.string().trim().min(2).max(80),
  projectId: optional(z.string().uuid()),
  phone: optional(phone),
});

/** status is still accepted for older clients and is audited as activate/deactivate. */
export const updateWorkerSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    documentId: documentId.optional(),
    position: z.string().trim().min(2).max(80).optional(),
    projectId: nullable(z.string().uuid()),
    phone: nullable(phone),
    status: z.enum(WORKER_STATUSES).optional(),
  })
  .strict();

export const listWorkersQuerySchema = z.object({
  projectId: optional(z.string().uuid()),
  /** "none" = not assigned to any project */
  assignment: optional(z.enum(["none"])),
  position: optional(z.string().trim().max(80)),
  status: optional(z.enum(WORKER_STATUSES)),
  search: optional(z.string().trim().max(100)),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
});

export type CreateWorkerInput = z.infer<typeof createWorkerSchema>;
export type UpdateWorkerInput = z.infer<typeof updateWorkerSchema>;
export type ListWorkersQuery = z.infer<typeof listWorkersQuerySchema>;
