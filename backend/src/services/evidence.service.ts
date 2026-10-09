import { uploadBuffer } from "../utils/cloud-storage";
import { incidentRepository } from "../repositories/incident.repository";
import { AppError } from "../utils/app-error";
import { evidenceRepository } from "../repositories/evidence.repository";
import { RequestUser } from "../types/auth";
import { projectAccess } from "./project-access.service";

export const evidenceService = {
  async list(filters: { projectId?: string; page: number; limit: number }, requester: RequestUser) {
    if (filters.projectId) await projectAccess.assert(requester, filters.projectId);

    const skip = (filters.page - 1) * filters.limit;
    const [evidence, total] = await evidenceRepository.findMany({
      projectId: filters.projectId,
      responsibleId: projectAccess.scope(requester),
      skip,
      take: filters.limit,
    });

    return {
      data: evidence,
      pagination: { page: filters.page, limit: filters.limit, total, totalPages: Math.ceil(total / filters.limit) },
    };
  },

  async upload(params: {
    projectId: string;
    activityId?: string;
    /** Optional: attach the photo to an incident of the same project */
    incidentId?: string;
    description?: string;
    buffer: Buffer;
    uploadedById: string;
  }, requester: RequestUser) {
    await projectAccess.assert(requester, params.projectId);
    if (params.incidentId) {
      const incident = await incidentRepository.findById(params.incidentId);
      if (!incident || incident.projectId !== params.projectId) throw new AppError(404, "Incident not found in this project");
    }

    const imageUrl = await uploadBuffer(params.buffer, "civil-works-evidence");

    return evidenceRepository.create({
      projectId: params.projectId,
      activityId: params.activityId,
      incidentId: params.incidentId,
      description: params.description,
      imageUrl,
      uploadedById: params.uploadedById,
    });
  },
};