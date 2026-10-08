import { incidentRepository } from "../repositories/incident.repository";
import { CreateIncidentInput, UpdateIncidentInput, ListIncidentsQuery } from "../schemas/incident.schema";
import { AppError } from "../utils/app-error";
import { RequestUser } from "../types/auth";
import { projectAccess } from "./project-access.service";
import { Incident } from "@prisma/client";

const PRIORITY_WEIGHT: Record<Incident["priority"], number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export const incidentService = {
  async list(query: ListIncidentsQuery, requester: RequestUser) {
    if (query.projectId) await projectAccess.assert(requester, query.projectId);

    const skip = (query.page - 1) * query.limit;
    const [incidents, total] = await incidentRepository.findMany({
      projectId: query.projectId,
      status: query.status,
      responsibleId: projectAccess.scope(requester),
      skip,
      take: query.limit,
    });

    // Reordenamos en memoria por el peso real de prioridad (HIGH > MEDIUM > LOW),
    // ya que el orden alfabético de Prisma no refleja la prioridad de negocio.
    const sorted = [...incidents].sort(
      (a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]
    );

    return {
      data: sorted,
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  },

  async create(data: CreateIncidentInput, requester: RequestUser) {
    await projectAccess.assert(requester, data.projectId);

    return incidentRepository.create(data);
  },

  async update(id: string, data: UpdateIncidentInput) {
    const existing = await incidentRepository.findById(id);
    if (!existing) throw new AppError(404, "Incident not found");

    return incidentRepository.update(id, data);
  },
};