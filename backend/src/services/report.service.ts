import { ExpenseCategory, IncidentType } from "@prisma/client";
import { prisma } from "../config/prisma";
import { reportRepository } from "../repositories/report.repository";
import { ReportQuery, ReportType } from "../schemas/report.schema";
import { RequestUser } from "../types/auth";
import { AppError } from "../utils/app-error";
import { businessDateKey, businessDayRange, daysAgo } from "../utils/business-time";
import { withReportMeta } from "../utils/report-meta";
import { RISK_THRESHOLDS } from "../config/risk-thresholds";
import { projectAccess } from "./project-access.service";
import { inventoryAnalysis } from "./inventory-analysis.service";

const DEFAULT_PERIOD_DAYS = 30;
const MAX_PERIOD_DAYS = 366;
const DAY_MS = 86_400_000;

interface Period {
  from: string;
  to: string;
  start: Date;
  end: Date;
  days: string[];
}

/** Inclusive business-date period; defaults to the last 30 days in Bogota. */
function resolvePeriod(query: ReportQuery): Period {
  const to = query.to ?? businessDateKey();
  const from = query.from ?? businessDateKey(daysAgo(DEFAULT_PERIOD_DAYS - 1, businessDayRange(to).start));
  const start = businessDayRange(from).start;
  const end = businessDayRange(to).end;
  const count = Math.round((end.getTime() - start.getTime()) / DAY_MS);
  if (count > MAX_PERIOD_DAYS) throw new AppError(400, `The period cannot exceed ${MAX_PERIOD_DAYS} days`);
  const days = Array.from({ length: count }, (_, i) => businessDateKey(new Date(start.getTime() + i * DAY_MS)));
  return { from, to, start, end, days };
}

/** Role-scoped project ids: one project (after an access check) or every visible project. */
async function scopedProjectIds(requester: RequestUser, projectId?: string) {
  if (projectId) {
    await projectAccess.assert(requester, projectId);
    return [projectId];
  }
  const responsibleId = projectAccess.scope(requester);
  const rows = await prisma.project.findMany({ where: { ...(responsibleId && { responsibleId }) }, select: { id: true } });
  return rows.map((r) => r.id);
}

/** Map of business day -> zeroed bucket, so charts always show every day of the period. */
function dayBuckets<T>(period: Period, empty: () => T) {
  return new Map(period.days.map((d) => [d, empty()]));
}

const round = (n: number, digits = 1) => Math.round(n * 10 ** digits) / 10 ** digits;

function expectedProgress(start: Date, end: Date, now: number) {
  if (now <= start.getTime()) return 0;
  if (now >= end.getTime()) return 100;
  return ((now - start.getTime()) / (end.getTime() - start.getTime())) * 100;
}

async function progressReport(requester: RequestUser, query: ReportQuery) {
  const period = resolvePeriod(query);
  const ids = await scopedProjectIds(requester, query.projectId);
  const [projects, activities, before, last] = await Promise.all([
    reportRepository.projects(ids),
    reportRepository.activitiesInRange(ids, period.start, period.end),
    reportRepository.lastActivityBefore(ids, period.start),
    reportRepository.lastActivityPerProject(ids),
  ]);

  const progressBefore = new Map(before.map((a) => [a.projectId, a.progressPercentage]));
  const lastByProject = new Map(last.map((a) => [a.projectId, a]));
  const activitiesByProject = new Map<string, number>();
  const series = dayBuckets(period, () => ({ activities: 0 }));
  for (const a of activities) {
    activitiesByProject.set(a.projectId, (activitiesByProject.get(a.projectId) ?? 0) + 1);
    const bucket = series.get(businessDateKey(a.date));
    if (bucket) bucket.activities++;
  }

  const now = Date.now();
  const rows = projects.map((p) => {
    const expected = expectedProgress(p.startDate, p.estimatedEndDate, now);
    const delay = expected - p.progressPercentage;
    return {
      projectId: p.id,
      name: p.name,
      type: p.type,
      status: p.status,
      municipality: p.municipality,
      responsible: p.responsible.name,
      progress: round(p.progressPercentage),
      expected: round(expected),
      delay: round(delay),
      onTrack: delay <= RISK_THRESHOLDS.SCHEDULE_DELAY,
      gainInPeriod: round(Math.max(0, p.progressPercentage - (progressBefore.get(p.id) ?? 0))),
      activitiesInPeriod: activitiesByProject.get(p.id) ?? 0,
      lastActivity: lastByProject.get(p.id) ?? null,
      estimatedEndDate: p.estimatedEndDate,
      daysRemaining: Math.ceil((p.estimatedEndDate.getTime() - now) / DAY_MS),
    };
  });

  const active = rows.filter((r) => r.status === "IN_PROGRESS");
  return {
    payload: {
      type: "progress" as const,
      period: { from: period.from, to: period.to },
      kpis: {
        projects: rows.length,
        inProgress: active.length,
        averageProgress: rows.length ? round(rows.reduce((s, r) => s + r.progress, 0) / rows.length) : 0,
        delayed: active.filter((r) => !r.onTrack).length,
        onTrack: active.filter((r) => r.onTrack).length,
        activitiesInPeriod: activities.length,
      },
      rows,
      series: [...series.entries()].map(([date, v]) => ({ date, ...v })),
    },
    recordCount: rows.length + activities.length,
  };
}

async function financialReport(requester: RequestUser, query: ReportQuery) {
  if (!projectAccess.isAdmin(requester)) throw new AppError(403, "The financial report is only available to administrators");
  const period = resolvePeriod(query);
  const ids = await scopedProjectIds(requester, query.projectId);
  const [projects, expenses, totals, transfers] = await Promise.all([
    reportRepository.projects(ids),
    reportRepository.approvedExpensesInRange(ids, period.start, period.end),
    reportRepository.totalsByProjectAndStatus(ids),
    reportRepository.transfersInRange(ids, period.start, period.end),
  ]);

  const approvedTotal = new Map<string, number>();
  const pendingTotal = new Map<string, number>();
  for (const t of totals) {
    (t.status === "APPROVED" ? approvedTotal : pendingTotal).set(t.projectId, Number(t._sum.amount ?? 0));
  }
  const inPeriod = new Map<string, number>();
  const byCategory = new Map<ExpenseCategory, number>();
  const series = dayBuckets(period, () => ({ approved: 0 }));
  for (const e of expenses) {
    const amount = Number(e.amount);
    inPeriod.set(e.projectId, (inPeriod.get(e.projectId) ?? 0) + amount);
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + amount);
    const bucket = series.get(businessDateKey(e.date));
    if (bucket) bucket.approved += amount;
  }

  let budget = 0;
  let spent = 0;
  let earned = 0;
  const rows = projects.map((p) => {
    const projectBudget = Number(p.budget);
    const approved = approvedTotal.get(p.id) ?? 0;
    const projectEarned = (projectBudget * p.progressPercentage) / 100;
    budget += projectBudget;
    spent += approved;
    earned += projectEarned;
    const executedPct = projectBudget > 0 ? (approved / projectBudget) * 100 : 0;
    return {
      projectId: p.id,
      name: p.name,
      status: p.status,
      budget: projectBudget,
      approvedTotal: approved,
      approvedInPeriod: inPeriod.get(p.id) ?? 0,
      pending: pendingTotal.get(p.id) ?? 0,
      available: projectBudget - approved,
      executedPct: round(executedPct),
      physicalProgress: round(p.progressPercentage),
      gap: round(executedPct - p.progressPercentage),
      cpi: approved > 0 ? round(projectEarned / approved, 2) : null,
    };
  });

  return {
    payload: {
      type: "financial" as const,
      period: { from: period.from, to: period.to },
      kpis: {
        totalBudget: budget,
        approvedTotal: spent,
        approvedInPeriod: expenses.reduce((s, e) => s + Number(e.amount), 0),
        pending: [...pendingTotal.values()].reduce((s, v) => s + v, 0),
        available: budget - spent,
        cpi: spent > 0 ? round(earned / spent, 2) : null,
        transfersInPeriod: Number(transfers._sum.amount ?? 0),
        overrunProjects: rows.filter((r) => r.gap > RISK_THRESHOLDS.FINANCIAL_GAP).length,
      },
      rows,
      byCategory: [...byCategory.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
      series: [...series.entries()].map(([date, v]) => ({ date, ...v })),
    },
    recordCount: rows.length + expenses.length,
  };
}

async function materialsReport(requester: RequestUser, query: ReportQuery) {
  const period = resolvePeriod(query);
  const isAdmin = projectAccess.isAdmin(requester);
  // Admins without a project filter also see movements not tied to any project
  const ids = isAdmin && !query.projectId ? null : await scopedProjectIds(requester, query.projectId);
  const [movements, analyzed, projects] = await Promise.all([
    reportRepository.movementsInRange(ids, period.start, period.end),
    inventoryAnalysis.analyzeAll(),
    reportRepository.projects(ids ?? (await scopedProjectIds(requester))),
  ]);

  const materialById = new Map(analyzed.map((m) => [m.id, m]));
  const projectName = new Map(projects.map((p) => [p.id, p.name]));
  const perMaterial = new Map<string, { in: number; out: number; movements: number }>();
  const perProject = new Map<string, { out: number; movements: number; materials: Set<string> }>();
  const series = dayBuckets(period, () => ({ in: 0, out: 0 }));
  let warnings = 0;

  // One pass over the movements fills every aggregation (Maps keyed by id)
  for (const mv of movements) {
    const m = perMaterial.get(mv.materialId) ?? { in: 0, out: 0, movements: 0 };
    m[mv.type === "IN" ? "in" : "out"] += mv.quantity;
    m.movements++;
    perMaterial.set(mv.materialId, m);
    if (mv.type === "OUT" && mv.projectId) {
      const p = perProject.get(mv.projectId) ?? { out: 0, movements: 0, materials: new Set<string>() };
      p.movements++;
      p.materials.add(mv.materialId);
      perProject.set(mv.projectId, p);
    }
    const bucket = series.get(businessDateKey(mv.date));
    if (bucket) bucket[mv.type === "IN" ? "in" : "out"]++;
    if (mv.expense?.status === "REJECTED") warnings++;
  }

  const rows = [...perMaterial.entries()]
    .map(([materialId, agg]) => {
      const m = materialById.get(materialId);
      return {
        materialId,
        name: m?.name ?? "",
        unit: m?.unit ?? "",
        category: m?.category ?? null,
        in: round(agg.in, 2),
        out: round(agg.out, 2),
        net: round(agg.in - agg.out, 2),
        movements: agg.movements,
        stock: m?.stockAvailable ?? 0,
        status: m?.status ?? "OK",
        coverageDays: m?.coverageDays ?? null,
      };
    })
    .sort((a, b) => b.movements - a.movements);

  const byProject = [...perProject.entries()]
    .map(([projectId, agg]) => ({
      projectId,
      name: projectName.get(projectId) ?? "",
      outMovements: agg.movements,
      materials: agg.materials.size,
    }))
    .sort((a, b) => b.outMovements - a.outMovements);

  return {
    payload: {
      type: "materials" as const,
      period: { from: period.from, to: period.to },
      kpis: {
        movements: movements.length,
        inMovements: movements.filter((m) => m.type === "IN").length,
        outMovements: movements.filter((m) => m.type === "OUT").length,
        materialsMoved: rows.length,
        criticalMaterials: analyzed.filter((m) => m.status === "OUT" || m.status === "CRITICAL").length,
        ...(isAdmin && { rejectedExpenseWarnings: warnings }),
      },
      rows,
      byProject,
      series: [...series.entries()].map(([date, v]) => ({ date, ...v })),
    },
    recordCount: movements.length + rows.length,
  };
}

async function incidentsReport(requester: RequestUser, query: ReportQuery) {
  const period = resolvePeriod(query);
  const ids = await scopedProjectIds(requester, query.projectId);
  const incidents = await reportRepository.incidentsInRange(ids, period.start, period.end);

  const byType = new Map<IncidentType, number>();
  const series = dayBuckets(period, () => ({ incidents: 0 }));
  const counts = { OPEN: 0, IN_REVIEW: 0, RESOLVED: 0 };
  let high = 0;
  for (const i of incidents) {
    byType.set(i.type, (byType.get(i.type) ?? 0) + 1);
    counts[i.status]++;
    if (i.priority === "HIGH") high++;
    const bucket = series.get(businessDateKey(i.date));
    if (bucket) bucket.incidents++;
  }

  return {
    payload: {
      type: "incidents" as const,
      period: { from: period.from, to: period.to },
      kpis: { total: incidents.length, open: counts.OPEN, inReview: counts.IN_REVIEW, resolved: counts.RESOLVED, highPriority: high },
      rows: incidents.map((i) => ({
        id: i.id,
        date: i.date,
        project: i.project,
        type: i.type,
        priority: i.priority,
        status: i.status,
        description: i.description,
      })),
      byType: [...byType.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
      series: [...series.entries()].map(([date, v]) => ({ date, ...v })),
    },
    recordCount: incidents.length,
  };
}

const BUILDERS = {
  progress: progressReport,
  financial: financialReport,
  materials: materialsReport,
  incidents: incidentsReport,
} as const;

export type ReportPayload = Awaited<ReturnType<(typeof BUILDERS)[ReportType]>>["payload"];
type Builder = (requester: RequestUser, query: ReportQuery) => Promise<{ payload: ReportPayload; recordCount: number }>;

export const reportService = {
  /** Builds a report server-side with role-filtered data and generation metadata. */
  generate(type: ReportType, query: ReportQuery, requester: RequestUser) {
    const build: Builder = BUILDERS[type];
    return withReportMeta<ReportPayload>(requester, () => build(requester, query));
  },
};
