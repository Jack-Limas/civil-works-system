import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { RequestUser } from "../types/auth";

/** Stable action codes (also the i18n keys the frontend translates). */
export const AUDIT_ACTIONS = {
  loginSucceeded: "auth.login",
  loginFailed: "auth.login_failed",
  logout: "auth.logout",
  passwordChanged: "auth.password_changed",
  passwordReset: "user.password_reset",
  userCreated: "user.created",
  userUpdated: "user.updated",
  userActivated: "user.activated",
  userDeactivated: "user.deactivated",
  settingsUpdated: "settings.updated",
  settingsReset: "settings.reset",
  expenseCreated: "expense.created",
  expenseApproved: "expense.approved",
  expenseRejected: "expense.rejected",
  transferCreated: "transfer.created",
  projectStatusChanged: "project.status_changed",
  movementRegistered: "inventory.movement",
  fieldReportReviewed: "field_report.reviewed",
  incidentCreated: "incident.created",
  incidentStatusChanged: "incident.status_changed",
  workerCreated: "worker.created",
  workerUpdated: "worker.updated",
  workerActivated: "worker.activated",
  workerDeactivated: "worker.deactivated",
} as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export type AuditEntity = "user" | "settings" | "expense" | "transfer" | "project" | "material" | "field_report" | "incident" | "worker";

export interface AuditContext {
  actorId: string | null;
  actorEmail: string;
  ip?: string | null;
  userAgent?: string | null;
}

export interface AuditEvent {
  action: AuditAction;
  entityType?: AuditEntity;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Only these metadata keys are ever stored. An allow-list (instead of a
 * deny-list) means a new field added to a model can never leak into the
 * history by accident; the deny pattern below is a second line of defence.
 */
const ALLOWED_KEYS = new Set([
  "before",
  "after",
  "name",
  "email",
  "role",
  "phone",
  "isActive",
  "status",
  "fromStatus",
  "toStatus",
  "note",
  "reason",
  "rejectionReason",
  "reviewNote",
  "resolutionNote",
  "amount",
  "category",
  "priority",
  "type",
  "quantity",
  "unit",
  "unitCost",
  "date",
  "projectId",
  "projectName",
  "materialId",
  "materialName",
  "expenseId",
  "residentId",
  "residentName",
  "position",
  "keys",
  "attempts",
  "method",
  "description",
  "revokedSessions",
  // system settings (inside before/after)
  "companyName",
  "scheduleDelayThreshold",
  "financialGapThreshold",
  "consumptionWindowDays",
  "criticalCoverageDays",
  "warningCoverageDays",
  "planningHorizonDays",
]);
const SECRET_KEY = /pass|hash|token|secret|cookie|authorization|api.?key/i;
const MAX_DEPTH = 3;
const MAX_ARRAY = 50;
const MAX_STRING = 500;

function normalize(value: unknown, depth: number): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Prisma.Decimal) return value.toNumber();
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, MAX_ARRAY).map((v) => normalize(v, depth + 1));
  if (typeof value === "object" && depth < MAX_DEPTH) return sanitize(value as Record<string, unknown>, depth + 1);
  return null;
}

/** Keeps allow-listed, non-secret keys only, recursively (e.g. inside before/after). */
export function sanitize(metadata: Record<string, unknown>, depth = 0): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!ALLOWED_KEYS.has(key) || SECRET_KEY.test(key)) continue;
    if (value === undefined) continue;
    clean[key] = normalize(value, depth);
  }
  return clean;
}

/**
 * { before, after } with only the fields that actually changed, or null when
 * nothing did (callers then skip the event). Values are compared after the
 * same normalisation used for storage, so Decimal(10) equals 10.
 */
export function diff<T extends Record<string, unknown>>(before: T, after: Partial<T>, fields: Array<keyof T & string>) {
  const changedBefore: Record<string, unknown> = {};
  const changedAfter: Record<string, unknown> = {};
  for (const field of fields) {
    if (!(field in after)) continue;
    const a = normalize(before[field], 0);
    const b = normalize(after[field], 0);
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      changedBefore[field] = a;
      changedAfter[field] = b;
    }
  }
  return Object.keys(changedAfter).length > 0 ? { before: changedBefore, after: changedAfter } : null;
}

function rowFor(event: AuditEvent, ctx: AuditContext): Prisma.AuditLogUncheckedCreateInput {
  return {
    actorId: ctx.actorId,
    actorEmail: ctx.actorEmail,
    action: event.action,
    entityType: event.entityType ?? null,
    entityId: event.entityId ?? null,
    metadata: event.metadata ? (sanitize(event.metadata) as Prisma.InputJsonValue) : Prisma.JsonNull,
    ip: ctx.ip ?? null,
    userAgent: ctx.userAgent ? ctx.userAgent.slice(0, 300) : null,
  };
}

export const audit = {
  /** Actor snapshot from the authenticated requester. */
  context(user: RequestUser): AuditContext {
    return { actorId: user.sub, actorEmail: user.email ?? "unknown", ip: user.ip ?? null, userAgent: user.userAgent ?? null };
  },

  /**
   * Inside a transaction: the event is part of it (if it fails the action rolls
   * back, so history and data never disagree).
   */
  record(db: Prisma.TransactionClient, event: AuditEvent, ctx: AuditContext) {
    return db.auditLog.create({ data: rowFor(event, ctx) });
  },

  /**
   * Without a transaction: best effort. A failure is logged (action code only,
   * never the metadata) and never breaks the action that triggered it.
   */
  async log(event: AuditEvent, ctx: AuditContext) {
    try {
      await prisma.auditLog.create({ data: rowFor(event, ctx) });
    } catch (error) {
      console.warn(`[audit] could not record ${event.action}:`, error instanceof Error ? error.message.slice(0, 200) : error);
    }
  },
};
