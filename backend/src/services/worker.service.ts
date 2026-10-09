import { Prisma, Worker } from "@prisma/client";
import { prisma } from "../config/prisma";
import { workerRepository } from "../repositories/worker.repository";
import { projectRepository } from "../repositories/project.repository";
import { CreateWorkerInput, UpdateWorkerInput, ListWorkersQuery } from "../schemas/worker.schema";
import { AppError } from "../utils/app-error";
import { RequestUser } from "../types/auth";
import { projectAccess } from "./project-access.service";
import { audit, AUDIT_ACTIONS, diff } from "./audit.service";

type WorkerWithProject = Awaited<ReturnType<typeof workerRepository.findById>> & {};

/** Residents see name, trade, status and project; document and phone are admin-only. */
function present(worker: WorkerWithProject, requester: RequestUser) {
  if (projectAccess.isAdmin(requester)) return worker;
  const { documentId: _documentId, phone: _phone, ...visible } = worker;
  return visible;
}

function duplicateDocument(): never {
  throw new AppError(409, "A worker with this document ID already exists", { code: "DOCUMENT_TAKEN" });
}

async function assertProjectExists(projectId: string | null | undefined) {
  if (projectId && !(await projectRepository.findById(projectId))) throw new AppError(404, "Project not found");
}

export const workerService = {
  async list(query: ListWorkersQuery, requester: RequestUser) {
    if (query.projectId) await projectAccess.assert(requester, query.projectId);
    const isAdmin = projectAccess.isAdmin(requester);
    const responsibleId = projectAccess.scope(requester);

    // Residents: only workers assigned to their projects (unassigned ones are not theirs)
    const scope: Prisma.WorkerWhereInput = responsibleId ? { project: { responsibleId } } : {};
    const where: Prisma.WorkerWhereInput = {
      ...scope,
      ...(query.projectId && { projectId: query.projectId }),
      ...(query.assignment === "none" && isAdmin && { projectId: null }),
      ...(query.position && { position: { equals: query.position, mode: "insensitive" } }),
      ...(query.status && { status: query.status }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { position: { contains: query.search, mode: "insensitive" } },
          // Searching by document is an admin feature (residents never see it)
          ...(isAdmin ? [{ documentId: { contains: query.search } }] : []),
        ],
      }),
    };

    const skip = (query.page - 1) * query.limit;
    const [[workers, total], [byStatus, unassigned, byPosition]] = await Promise.all([
      workerRepository.findMany(where, skip, query.limit),
      workerRepository.summary(scope),
    ]);
    const countStatus = (status: Worker["status"]) =>
      (byStatus.find((g) => g.status === status)?._count as { _all: number } | undefined)?._all ?? 0;

    return {
      data: workers.map((w) => present(w, requester)),
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
      summary: {
        active: countStatus("ACTIVE"),
        inactive: countStatus("INACTIVE"),
        unassigned: isAdmin ? unassigned : 0,
        positions: byPosition.map((g) => ({ position: g.position, count: (g._count as { _all: number })._all })),
      },
    };
  },

  async detail(id: string, requester: RequestUser) {
    const worker = await workerRepository.findById(id);
    if (!worker) throw new AppError(404, "Worker not found");
    if (!projectAccess.isAdmin(requester)) {
      // A resident only reaches workers assigned to one of their projects
      if (!worker.project || worker.project.responsibleId !== requester.sub) throw new AppError(404, "Worker not found");
    }
    return present(worker, requester);
  },

  async create(data: CreateWorkerInput, requester: RequestUser) {
    if (await workerRepository.findByDocumentId(data.documentId)) duplicateDocument();
    await assertProjectExists(data.projectId);

    try {
      return await prisma.$transaction(async (tx) => {
        const worker = await workerRepository.create(tx, data);
        await audit.record(
          tx,
          { action: AUDIT_ACTIONS.workerCreated, entityType: "worker", entityId: worker.id, metadata: { name: worker.name, position: worker.position, projectId: worker.projectId } },
          audit.context(requester)
        );
        return worker;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") duplicateDocument();
      throw error;
    }
  },

  /** Details; a status in the body is applied through activate/deactivate (audited as such). */
  async update(id: string, data: UpdateWorkerInput, requester: RequestUser) {
    const existing = await workerRepository.findById(id);
    if (!existing) throw new AppError(404, "Worker not found");
    const { status, ...details } = data;

    if (details.documentId && details.documentId !== existing.documentId && (await workerRepository.findByDocumentId(details.documentId))) {
      duplicateDocument();
    }
    await assertProjectExists(details.projectId);

    // Document number and phone are personal data: the history only says they changed
    const changes = diff(existing, details, ["name", "position", "projectId"]);
    const personalKeys = (["documentId", "phone"] as const).filter((k) => details[k] !== undefined && details[k] !== existing[k]);
    if (changes || personalKeys.length > 0) {
      await prisma.$transaction(async (tx) => {
        await workerRepository.update(tx, id, details);
        await audit.record(
          tx,
          {
            action: AUDIT_ACTIONS.workerUpdated,
            entityType: "worker",
            entityId: id,
            metadata: { name: existing.name, ...(changes ?? {}), ...(personalKeys.length > 0 && { keys: personalKeys }) },
          },
          audit.context(requester)
        );
      });
    }
    if (status && status !== existing.status) return this.setStatus(id, status, requester);
    return workerRepository.findById(id);
  },

  /** Workers are deactivated, never deleted. */
  async setStatus(id: string, status: Worker["status"], requester: RequestUser) {
    const existing = await workerRepository.findById(id);
    if (!existing) throw new AppError(404, "Worker not found");
    if (existing.status === status) {
      throw new AppError(409, status === "ACTIVE" ? "Worker is already active" : "Worker is already inactive", { code: "SAME_STATUS" });
    }

    return prisma.$transaction(async (tx) => {
      const worker = await workerRepository.update(tx, id, { status });
      await audit.record(
        tx,
        {
          action: status === "ACTIVE" ? AUDIT_ACTIONS.workerActivated : AUDIT_ACTIONS.workerDeactivated,
          entityType: "worker",
          entityId: id,
          metadata: { name: existing.name, position: existing.position, projectId: existing.projectId },
        },
        audit.context(requester)
      );
      return worker;
    });
  },
};
