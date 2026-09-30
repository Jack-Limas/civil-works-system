import { FastifyReply, FastifyRequest } from "fastify";
import { dashboardService } from "../services/dashboard.service";

export const dashboardController = {
  async summary(request: FastifyRequest, reply: FastifyReply) {
    const data = await dashboardService.getGeneralSummary();
    return reply.send({ data });
  },

  async recentActivity(request: FastifyRequest, reply: FastifyReply) {
    const data = await dashboardService.getRecentActivity();
    return reply.send({ data });
  },
};