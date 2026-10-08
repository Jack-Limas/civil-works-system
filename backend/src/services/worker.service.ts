import { workerRepository } from "../repositories/worker.repository";
import { CreateWorkerInput, UpdateWorkerInput, ListWorkersQuery } from "../schemas/worker.schema";
import { AppError } from "../utils/app-error";
import { RequestUser } from "../types/auth";
import { projectAccess } from "./project-access.service";

export const workerService = {
  async list(query: ListWorkersQuery, requester: RequestUser) {
    if (query.projectId) await projectAccess.assert(requester, query.projectId);

    const skip = (query.page - 1) * query.limit;
    const [workers, total] = await workerRepository.findMany({
      projectId: query.projectId,
      responsibleId: projectAccess.scope(requester),
      skip,
      take: query.limit,
    });

    // Residents only see their own projects' workers and never their document ID
    const isAdmin = projectAccess.isAdmin(requester);
    return {
      data: isAdmin ? workers : workers.map(({ documentId: _documentId, ...rest }) => rest),
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  },

  async create(data: CreateWorkerInput) {
    const existing = await workerRepository.findByDocumentId(data.documentId);
    if (existing) throw new AppError(409, "A worker with this document ID already exists");

    return workerRepository.create(data);
  },

  async update(id: string, data: UpdateWorkerInput) {
    const existing = await workerRepository.findById(id);
    if (!existing) throw new AppError(404, "Worker not found");

    return workerRepository.update(id, data);
  },
};