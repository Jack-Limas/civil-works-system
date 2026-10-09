import { z } from "zod";

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const optional = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(emptyToUndefined, schema.optional());

export const ROLES = ["ADMIN", "RESIDENT_ENGINEER"] as const;
export const USER_STATUSES = ["active", "inactive"] as const;

/** Colombian mobile or landline as typed by people: digits, spaces, +, - and parentheses. */
const phone = z
  .string()
  .trim()
  .max(30)
  .regex(/^[\d\s+()-]{7,30}$/, "Invalid phone number");

export const listUsersQuerySchema = z.object({
  search: optional(z.string().trim().max(100)),
  role: optional(z.enum(ROLES)),
  status: optional(z.enum(USER_STATUSES)),
  page: z.coerce.number().int().positive().default(1),
  // High default keeps older callers (resident pickers) receiving every user
  limit: z.coerce.number().int().positive().max(200).default(100),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(160),
  role: z.enum(ROLES),
  phone: optional(phone),
});

/** Email is the login identity and is not editable here; role changes go through the safeguards. */
export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    phone: z.preprocess((v) => (v === "" ? null : v), phone.nullable().optional()),
    role: z.enum(ROLES).optional(),
  })
  .strict();

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
