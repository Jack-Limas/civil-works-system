import { FastifyReply, FastifyRequest } from "fastify";
import { dashboardService } from "../services/dashboard.service";

export const dashboardController = {
  async summary(request: FastifyRequest, reply: FastifyReply) {
    const data = await dashboardService.getGeneralSummary(request.user);
    return reply.send({ data });
  },

  async recentActivity(request: FastifyRequest, reply: FastifyReply) {
    const data = await dashboardService.getRecentActivity(request.user);
    return reply.send({ data });
  },
};