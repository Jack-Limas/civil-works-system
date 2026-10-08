import { z } from "zod";
import { EXPENSE_CATEGORIES } from "./supplier.schema";

export const PAYMENT_METHODS = ["CASH", "TRANSFER", "CARD", "CHECK", "OTHER"] as const;
export const EXPENSE_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;

/** Multipart forms send every field as a string; empty strings mean "not provided". */
const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const optional = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(emptyToUndefined, schema.optional());

export const createExpenseSchema = z.object({
  projectId: z.string().uuid(),
  category: z.enum(EXPENSE_CATEGORIES),
  // COP has no decimals in this product; Decimal(14,2) caps the value
  amount: z.coerce.number().positive().max(999_999_999_999),
  date: optional(z.coerce.date()),
  description: optional(z.string().trim().max(500)),
  supplierId: optional(z.string().uuid()),
  paymentMethod: optional(z.enum(PAYMENT_METHODS)),
  invoiceNumber: optional(z.string().trim().max(60)),
  /**
   * Optional stock entry created in the same transaction (MATERIALS only).
   * Multipart forms send it as a JSON string.
   */
  inventoryEntry: optional(
    z.preprocess(
      (v) => {
        if (typeof v !== "string") return v;
        try {
          return JSON.parse(v);
        } catch {
          return v;
        }
      },
      z.object({
        materialId: z.string().uuid(),
        quantity: z.coerce.number().positive().max(1_000_000_000),
        unitCost: optional(z.coerce.number().positive().max(999_999_999_999)),
      })
    )
  ),
  // registeredById, status and review fields are NOT accepted from clients
});

export const listExpensesQuerySchema = z.object({
  projectId: optional(z.string().uuid()),
  status: optional(z.enum(EXPENSE_STATUSES)),
  category: optional(z.enum(EXPENSE_CATEGORIES)),
  supplierId: optional(z.string().uuid()),
  registeredById: optional(z.string().uuid()),
  from: optional(z.coerce.date()),
  to: optional(z.coerce.date()),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const reviewExpenseSchema = z
  .object({
    decision: z.enum(["APPROVE", "REJECT"]),
    reason: optional(z.string().trim().min(3).max(300)),
  })
  .refine((v) => v.decision === "APPROVE" || !!v.reason, {
    path: ["reason"],
    message: "A reason is required to reject an expense",
  });

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>;
export type ReviewExpenseInput = z.infer<typeof reviewExpenseSchema>;
