import { FastifyReply, FastifyRequest } from "fastify";
import { alertService } from "../services/alert.service";

export const alertController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as { projectId?: string; status?: "ACTIVE" | "RESOLVED"; page?: string; limit?: string };
    const result = await alertService.list({
      projectId: query.projectId,
      status: query.status,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 20,
    });
    return reply.send(result);
  },

  async generateForProject(request: FastifyRequest<{ Params: { projectId: string } }>, reply: FastifyReply) {
    const alerts = await alertService.generateForProject(request.params.projectId);
    return reply.send({ data: alerts, message: `${alerts.length} new alert(s) generated` });
  },

  async generateForAll(request: FastifyRequest, reply: FastifyReply) {
    const result = await alertService.generateForAllProjects();
    return reply.send({ data: result });
  },

  async resolve(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const alert = await alertService.resolve(request.params.id);
    return reply.send({ data: alert });
  },
};