import { Prisma } from "@prisma/client";
import { fieldReportRepository } from "../repositories/field-report.repository";
import {
  CreateFieldReportInput,
  ListFieldReportsQuery,
  UpdateFieldReportInput,
} from "../schemas/field-report.schema";
import { RequestUser } from "../types/auth";
import { AppError } from "../utils/app-error";
import { businessDateKey, businessDayRange, dateKeyToDbDate, dbDateToKey } from "../utils/business-time";
import { projectAccess } from "./project-access.service";
import { audit, AUDIT_ACTIONS } from "./audit.service";

type FieldReportRow = NonNullable<Awaited<ReturnType<typeof fieldReportRepository.findById>>>;

/** API shape: the @db.Date is sent as the business date string "YYYY-MM-DD". */
function present(report: FieldReportRow) {
  return { ...report, date: dbDateToKey(report.date) };
}

/**
 * Everything recorded on a project during one business day, compiled
 * automatically so the resident only adds what the system cannot know
 * (weather, crew size, narrative, observations).
 */
async function compile(projectId: string, dateKey: string) {
  const { start, end } = businessDayRange(dateKey);
  const [activities, incidents, evidence, movements, expenses] = await fieldReportRepository.compileDay(projectId, start, end);
  return {
    date: dateKey,
    activities,
    incidents,
    evidence,
    materialMovements: movements,
    expenses: expenses.map((e) => ({ ...e, amount: Number(e.amount) })),
    counts: {
      activities: activities.length,
      incidents: incidents.length,
      evidence: evidence.length,
      materialMovements: movements.length,
      expenses: expenses.length,
    },
  };
}

function resolveDate(dateKey: string | undefined) {
  const today = businessDateKey();
  const key = dateKey ?? today;
  if (key > today) throw new AppError(400, "A daily log cannot be dated in the future");
  return key;
}

export const fieldReportService = {
  async list(query: ListFieldReportsQuery, requester: RequestUser) {
    if (query.projectId) await projectAccess.assert(requester, query.projectId);
    const responsibleId = projectAccess.scope(requester);
    const where: Prisma.FieldReportWhereInput = {
      ...(query.projectId && { projectId: query.projectId }),
      ...(query.status && { status: query.status }),
      ...(query.authorId && { authorId: query.authorId }),
      ...((query.from || query.to) && {
        date: {
          ...(query.from && { gte: dateKeyToDbDate(query.from) }),
          ...(query.to && { lte: dateKeyToDbDate(query.to) }),
        },
      }),
      ...(responsibleId && { project: { responsibleId } }),
    };

    const skip = (query.page - 1) * query.limit;
    const [rows, total] = await fieldReportRepository.findMany(where, skip, query.limit);
    return {
      data: rows.map(present),
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
      // Handy for the admin badge and the resident "today" indicator
      pendingReview: await fieldReportRepository.countSubmitted({ ...(responsibleId && { project: { responsibleId } }) }),
      today: businessDateKey(),
    };
  },

  /** Day compilation for the form; also reports whether that day's log already exists. */
  async compileForForm(projectId: string, dateKey: string | undefined, requester: RequestUser) {
    await projectAccess.assert(requester, projectId);
    const key = resolveDate(dateKey);
    const existing = await fieldReportRepository.findByProjectAndDate(projectId, dateKeyToDbDate(key));
    return { ...(await compile(projectId, key)), existingReportId: existing?.id ?? null };
  },

  async create(input: CreateFieldReportInput, requester: RequestUser) {
    await projectAccess.assert(requester, input.projectId);
    const key = resolveDate(input.date);
    const date = dateKeyToDbDate(key);

    const existing = await fieldReportRepository.findByProjectAndDate(input.projectId, date);
    if (existing) {
      throw new AppError(409, "A daily log already exists for this project and date", { existingId: existing.id });
    }

    try {
      const report = await fieldReportRepository.create({
        projectId: input.projectId,
        date,
        weather: input.weather,
        workersOnSite: input.workersOnSite,
        summary: input.summary,
        issues: input.issues,
        authorId: requester.sub,
      });
      return present(report);
    } catch (error) {
      // Two simultaneous submissions: the unique (projectId, date) index decides
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const winner = await fieldReportRepository.findByProjectAndDate(input.projectId, date);
        throw new AppError(409, "A daily log already exists for this project and date", { existingId: winner?.id });
      }
      throw error;
    }
  },

  async detail(id: string, requester: RequestUser) {
    const report = await fieldReportRepository.findById(id);
    if (!report) throw new AppError(404, "Daily log not found");
    await projectAccess.assert(requester, report.projectId);
    const key = dbDateToKey(report.date);
    return { ...present(report), compiled: await compile(report.projectId, key) };
  },

  async update(id: string, input: UpdateFieldReportInput, requester: RequestUser) {
    const report = await fieldReportRepository.findById(id);
    if (!report) throw new AppError(404, "Daily log not found");
    if (report.authorId !== requester.sub) throw new AppError(403, "Only the author can edit this daily log");
    if (report.status !== "SUBMITTED") throw new AppError(409, "A reviewed daily log cannot be edited");

    const updated = await fieldReportRepository.updateIfSubmitted(id, requester.sub, input);
    if (updated === 0) throw new AppError(409, "A reviewed daily log cannot be edited");
    return present((await fieldReportRepository.findById(id))!);
  },

  async review(id: string, note: string | undefined, requester: RequestUser) {
    const report = await fieldReportRepository.findById(id);
    if (!report) throw new AppError(404, "Daily log not found");
    if (report.status !== "SUBMITTED") throw new AppError(409, "This daily log was already reviewed");

    const updated = await fieldReportRepository.reviewIfSubmitted(id, requester.sub, note);
    if (updated === 0) throw new AppError(409, "This daily log was already reviewed");
    await audit.log(
      {
        action: AUDIT_ACTIONS.fieldReportReviewed,
        entityType: "field_report",
        entityId: id,
        metadata: { projectId: report.projectId, date: report.date, reviewNote: note ?? null },
      },
      audit.context(requester)
    );
    return present((await fieldReportRepository.findById(id))!);
  },
};
