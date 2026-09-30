import { cloudinary } from "../config/cloudinary";
import { evidenceRepository } from "../repositories/evidence.repository";
import { projectRepository } from "../repositories/project.repository";
import { AppError } from "../utils/app-error";

function uploadBuffer(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "civil-works-evidence" },
      (error, result) => {
        if (error || !result) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

export const evidenceService = {
  async list(filters: { projectId?: string; page: number; limit: number }) {
    const skip = (filters.page - 1) * filters.limit;
    const [evidence, total] = await evidenceRepository.findMany({
      projectId: filters.projectId,
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
  }) {
    const project = await projectRepository.findById(params.projectId);
    if (!project) throw new AppError(404, "Project not found");

    const imageUrl = await uploadBuffer(params.buffer);

    return evidenceRepository.create({
      projectId: params.projectId,
      activityId: params.activityId,
      description: params.description,
      imageUrl,
      uploadedById: params.uploadedById,
    });
  },
};