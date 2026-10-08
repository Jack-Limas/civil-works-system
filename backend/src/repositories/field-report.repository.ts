import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

export const fieldReportInclude = {
  project: { select: { id: true, name: true, municipality: true, responsibleId: true } },
  author: { select: { id: true, name: true } },
  reviewedBy: { select: { id: true, name: true } },
} satisfies Prisma.FieldReportInclude;

export const fieldReportRepository = {
  findMany(where: Prisma.FieldReportWhereInput, skip: number, take: number) {
    return Promise.all([
      prisma.fieldReport.findMany({
        where,
        skip,
        take,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        include: fieldReportInclude,
      }),
      prisma.fieldReport.count({ where }),
    ]);
  },

  findById(id: string) {
    return prisma.fieldReport.findUnique({ where: { id }, include: fieldReportInclude });
  },

  findByProjectAndDate(projectId: string, date: Date) {
    return prisma.fieldReport.findUnique({ where: { projectId_date: { projectId, date } }, select: { id: true } });
  },

  countSubmitted(where: Prisma.FieldReportWhereInput) {
    return prisma.fieldReport.count({ where: { ...where, status: "SUBMITTED" } });
  },

  create(data: Prisma.FieldReportUncheckedCreateInput) {
    return prisma.fieldReport.create({ data, include: fieldReportInclude });
  },

  /** Only the author, only while SUBMITTED: a REVIEWED report is immutable. */
  async updateIfSubmitted(id: string, authorId: string, data: Prisma.FieldReportUpdateInput) {
    const { count } = await prisma.fieldReport.updateMany({ where: { id, authorId, status: "SUBMITTED" }, data });
    return count;
  },

  async reviewIfSubmitted(id: string, reviewerId: string, note: string | undefined) {
    const { count } = await prisma.fieldReport.updateMany({
      where: { id, status: "SUBMITTED" },
      data: { status: "REVIEWED", reviewedById: reviewerId, reviewedAt: new Date(), reviewNote: note ?? null },
    });
    return count;
  },

  /** Everything recorded on the project during one business day (UTC range). */
  compileDay(projectId: string, start: Date, end: Date) {
    const range = { gte: start, lt: end };
    return Promise.all([
      prisma.activity.findMany({
        where: { projectId, date: range },
        orderBy: { date: "asc" },
        select: { id: true, name: true, progressPercentage: true, observations: true, date: true, responsible: { select: { name: true } } },
      }),
      prisma.incident.findMany({
        where: { projectId, date: range },
        orderBy: { date: "asc" },
        select: { id: true, type: true, priority: true, status: true, description: true, date: true },
      }),
      prisma.evidence.findMany({
        where: { projectId, date: range },
        orderBy: { date: "asc" },
        select: { id: true, imageUrl: true, description: true, date: true },
      }),
      prisma.inventoryMovement.findMany({
        where: { projectId, date: range },
        orderBy: { date: "asc" },
        select: { id: true, type: true, quantity: true, date: true, notes: true, material: { select: { id: true, name: true, unit: true } } },
      }),
      prisma.expense.findMany({
        where: { projectId, date: range },
        orderBy: { date: "asc" },
        select: { id: true, category: true, amount: true, status: true, description: true, date: true, supportUrl: true },
      }),
    ]);
  },
};
