import { FastifyReply, FastifyRequest } from "fastify";
import { evidenceService } from "../services/evidence.service";
import { AppError } from "../utils/app-error";
import { assertValidImageFile } from "../utils/file-validation";

export const evidenceController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as { projectId?: string; page?: string; limit?: string };
    const result = await evidenceService.list({
      projectId: query.projectId,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 20,
    }, request.user);
    return reply.send(result);
  },

  async upload(request: FastifyRequest, reply: FastifyReply) {
    const data = await request.file();
    if (!data) throw new AppError(400, "No file was uploaded");

    const fields = data.fields as any;
    const projectId = fields.projectId?.value;
    const activityId = fields.activityId?.value;
    const description = fields.description?.value;

    if (!projectId) throw new AppError(400, "projectId is required");

    const buffer = await data.toBuffer();
    assertValidImageFile(buffer, data.mimetype, data.file.truncated);
    const user = request.user;

    const evidence = await evidenceService.upload({
      projectId,
      activityId,
      description,
      buffer,
      uploadedById: user.sub,
    }, user);

    return reply.code(201).send({ data: evidence });
  },
};