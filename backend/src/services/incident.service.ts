import { IncidentStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { incidentRepository } from "../repositories/incident.repository";
import {
  ChangeIncidentStatusInput,
  CreateIncidentInput,
  ListIncidentsQuery,
  UpdateIncidentInput,
} from "../schemas/incident.schema";
import { AppError } from "../utils/app-error";
import { businessDayRange, businessMonthStart } from "../utils/business-time";
import { RequestUser } from "../types/auth";
import { projectAccess } from "./project-access.service";
import { audit, AUDIT_ACTIONS, diff } from "./audit.service";

/** Lifecycle order: residents can only move forward; going back (reopening) is admin-only. */
const STATUS_ORDER: Record<IncidentStatus, number> = { OPEN: 0, IN_REVIEW: 1, RESOLVED: 2 };

function orderFor(sort: ListIncidentsQuery["sort"]): Prisma.IncidentOrderByWithRelationInput[] {
  // Priority enum is declared LOW < MEDIUM < HIGH, so "desc" puts HIGH first in the database
  return sort === "date" ? [{ date: "desc" }] : [{ priority: "desc" }, { date: "desc" }];
}

export const incidentService = {
  async list(query: ListIncidentsQuery, requester: RequestUser) {
    if (query.projectId) await projectAccess.assert(requester, query.projectId);

    const responsibleId = projectAccess.scope(requester);
    const scope: Prisma.IncidentWhereInput = {
      ...(query.projectId && { projectId: query.projectId }),
      ...(responsibleId && { project: { responsibleId } }),
    };
    const date: Prisma.DateTimeFilter = {};
    if (query.from) date.gte = businessDayRange(query.from).start;
    if (query.to) date.lt = businessDayRange(query.to).end;

    const where: Prisma.IncidentWhereInput = {
      ...scope,
      ...(query.status && { status: query.status }),
      ...(query.state === "active" && !query.status && { status: { in: ["OPEN", "IN_REVIEW"] } }),
      ...(query.priority && { priority: query.priority }),
      ...(query.type && { type: query.type }),
      ...(query.reportedById && { reportedById: query.reportedById }),
      ...(query.search && { description: { contains: query.search, mode: "insensitive" } }),
      ...((query.from || query.to) && { date }),
    };

    const skip = (query.page - 1) * query.limit;
    const [[incidents, total], [open, inProgress, highActive, resolvedThisMonth]] = await Promise.all([
      incidentRepository.findMany(where, orderFor(query.sort), skip, query.limit),
      incidentRepository.summary(scope, businessMonthStart()),
    ]);

    return {
      data: incidents,
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
      summary: { open, inProgress, highActive, resolvedThisMonth },
    };
  },

  async detail(id: string, requester: RequestUser) {
    const incident = await incidentRepository.findDetail(id);
    if (!incident) throw new AppError(404, "Incident not found");
    await projectAccess.assert(requester, incident.projectId);
    return incident;
  },

  /** Residents report only on their own projects; the reporter is the session user. */
  async create(data: CreateIncidentInput, requester: RequestUser) {
    await projectAccess.assert(requester, data.projectId);

    const id = await prisma.$transaction(async (tx) => {
      const incident = await incidentRepository.create(tx, { ...data, reportedById: requester.sub, status: "OPEN" });
      await incidentRepository.addStatusChange(tx, { incidentId: incident.id, fromStatus: null, toStatus: "OPEN", changedById: requester.sub });
      await audit.record(
        tx,
        {
          action: AUDIT_ACTIONS.incidentCreated,
          entityType: "incident",
          entityId: incident.id,
          metadata: { projectId: incident.projectId, type: incident.type, priority: incident.priority },
        },
        audit.context(requester)
      );
      return incident.id;
    });
    return incidentRepository.findDetail(id);
  },

  /**
   * Details (type, description, priority, date). Admins always; the responsible
   * resident while the incident is not resolved. A `status` in the body goes
   * through the transition rules (kept for older clients).
   */
  async update(id: string, data: UpdateIncidentInput, requester: RequestUser) {
    const existing = await incidentRepository.findById(id);
    if (!existing) throw new AppError(404, "Incident not found");
    await projectAccess.assert(requester, existing.projectId);

    const { status, ...details } = data;
    const changes = diff(existing, details, ["type", "description", "priority", "date"]);
    if (changes) {
      if (!projectAccess.isAdmin(requester) && existing.status === "RESOLVED") {
        throw new AppError(403, "Only an administrator can edit a resolved incident");
      }
      // Editing details is not a listed audit event; the status history covers the lifecycle
      await incidentRepository.update(prisma, id, details);
    }
    if (status && status !== existing.status) return this.changeStatus(id, { status }, requester, { skipNoteRule: true });
    return incidentRepository.findDetail(id);
  },

  /**
   * OPEN -> IN_REVIEW ("in progress") -> RESOLVED. The admin and the project's
   * responsible resident move it forward; only the admin reopens or moves it
   * back. Resolving stamps who/when and the resolution note. The status, its
   * history row and the audit event are written together, and the update is
   * conditional on the status read, so two people acting at once cannot both win.
   */
  async changeStatus(
    id: string,
    input: ChangeIncidentStatusInput,
    requester: RequestUser,
    options: { skipNoteRule?: boolean } = {}
  ) {
    const existing = await incidentRepository.findById(id);
    if (!existing) throw new AppError(404, "Incident not found");
    await projectAccess.assert(requester, existing.projectId);

    const from = existing.status;
    const to = input.status;
    if (from === to) throw new AppError(409, "The incident already has this status", { code: "SAME_STATUS" });
    if (!projectAccess.isAdmin(requester) && STATUS_ORDER[to] < STATUS_ORDER[from]) {
      throw new AppError(403, "Only an administrator can reopen an incident", { code: "REOPEN_ADMIN_ONLY" });
    }
    if (to === "RESOLVED" && !options.skipNoteRule && !input.note) {
      throw new AppError(400, "A resolution note is required");
    }

    const resolving = to === "RESOLVED";
    await prisma.$transaction(async (tx) => {
      const moved = await incidentRepository.transitionIfStatus(tx, id, from, {
        status: to,
        resolvedAt: resolving ? new Date() : null,
        resolvedById: resolving ? requester.sub : null,
        resolutionNote: resolving ? (input.note ?? null) : null,
      });
      if (moved === 0) throw new AppError(409, "The incident changed meanwhile; reload and try again", { code: "STALE_STATUS" });

      await incidentRepository.addStatusChange(tx, { incidentId: id, fromStatus: from, toStatus: to, changedById: requester.sub, note: input.note ?? null });
      await audit.record(
        tx,
        {
          action: AUDIT_ACTIONS.incidentStatusChanged,
          entityType: "incident",
          entityId: id,
          metadata: { projectId: existing.projectId, projectName: existing.project.name, fromStatus: from, toStatus: to, note: input.note ?? null },
        },
        audit.context(requester)
      );
    });
    return incidentRepository.findDetail(id);
  },
};
