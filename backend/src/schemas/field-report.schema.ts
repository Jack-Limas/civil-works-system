import { z } from "zod";
import { isValidDateKey } from "../utils/business-time";

export const WEATHER_VALUES = ["SUNNY", "CLOUDY", "RAINY", "STORMY"] as const;
export const FIELD_REPORT_STATUSES = ["SUBMITTED", "REVIEWED"] as const;

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const optional = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(emptyToUndefined, schema.optional());
const dateKey = z.string().refine(isValidDateKey, "Expected a date as YYYY-MM-DD");

const editableFields = {
  weather: optional(z.enum(WEATHER_VALUES)),
  workersOnSite: optional(z.coerce.number().int().min(0).max(5000)),
  summary: z.string().trim().min(10).max(4000),
  issues: optional(z.string().trim().max(4000)),
};

export const createFieldReportSchema = z.object({
  projectId: z.string().uuid(),
  /** Business date (America/Bogota); defaults to today. Future dates are rejected in the service. */
  date: optional(dateKey),
  ...editableFields,
  // authorId is taken from the session
});

/** The author may edit the narrative while SUBMITTED; project and date are fixed. */
export const updateFieldReportSchema = z.object(editableFields).partial().strict();

export const reviewFieldReportSchema = z.object({
  note: optional(z.string().trim().max(1000)),
});

export const listFieldReportsQuerySchema = z.object({
  projectId: optional(z.string().uuid()),
  status: optional(z.enum(FIELD_REPORT_STATUSES)),
  authorId: optional(z.string().uuid()),
  from: optional(dateKey),
  to: optional(dateKey),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const compileQuerySchema = z.object({
  projectId: z.string().uuid(),
  date: optional(dateKey),
});

export type CreateFieldReportInput = z.infer<typeof createFieldReportSchema>;
export type UpdateFieldReportInput = z.infer<typeof updateFieldReportSchema>;
export type ListFieldReportsQuery = z.infer<typeof listFieldReportsQuerySchema>;
