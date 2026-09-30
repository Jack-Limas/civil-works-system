import { z } from "zod";

export const createExpenseSchema = z.object({
  projectId: z.string().uuid(),
  category: z.enum(["MATERIALS", "LABOR", "EQUIPMENT", "TRANSPORT", "FUEL", "OTHER"]),
  amount: z.number().positive(),
  date: z.coerce.date().optional(),
  description: z.string().optional(),
});

export const listExpensesQuerySchema = z.object({
  projectId: z.string().uuid(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>;