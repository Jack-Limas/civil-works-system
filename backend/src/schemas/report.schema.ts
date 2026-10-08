import { z } from "zod";
import { isValidDateKey } from "../utils/business-time";

export const REPORT_TYPES = ["progress", "financial", "materials", "incidents"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const dateKey = z.string().refine(isValidDateKey, "Expected a date as YYYY-MM-DD");

/** Period filters use business dates (America/Bogota), inclusive on both ends. */
export const reportQuerySchema = z
  .object({
    projectId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
    from: z.preprocess(emptyToUndefined, dateKey.optional()),
    to: z.preprocess(emptyToUndefined, dateKey.optional()),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, { path: ["to"], message: "'to' must be on or after 'from'" });

export const reportTypeParamsSchema = z.object({ type: z.enum(REPORT_TYPES) });

export const reportSummarySchema = z
  .object({
    type: z.enum(REPORT_TYPES),
    projectId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
    from: z.preprocess(emptyToUndefined, dateKey.optional()),
    to: z.preprocess(emptyToUndefined, dateKey.optional()),
    locale: z.enum(["es", "en"]).default("es"),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, { path: ["to"], message: "'to' must be on or after 'from'" });

export type ReportQuery = z.infer<typeof reportQuerySchema>;
export type ReportSummaryInput = z.infer<typeof reportSummarySchema>;
