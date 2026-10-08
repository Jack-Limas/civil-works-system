import { uploadBuffer } from "../utils/cloud-storage";
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
    description?: string;
    buffer: Buffer;
    uploadedById: string;
  }, requester: RequestUser) {
    await projectAccess.assert(requester, params.projectId);

    const imageUrl = await uploadBuffer(params.buffer, "civil-works-evidence");

    return evidenceRepository.create({
      projectId: params.projectId,
      activityId: params.activityId,
      description: params.description,
      imageUrl,
      uploadedById: params.uploadedById,
    });
  },
};