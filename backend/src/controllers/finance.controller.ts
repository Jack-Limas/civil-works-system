import { FastifyReply, FastifyRequest } from "fastify";
import { cashflowQuerySchema } from "../schemas/finance.schema";
import { financeService } from "../services/finance.service";

export const financeController = {
  async summary(request: FastifyRequest, reply: FastifyReply) {
    return reply.send({ data: await financeService.summary(request.user) });
  },

  async cashflow(request: FastifyRequest, reply: FastifyReply) {
    const query = cashflowQuerySchema.parse(request.query);
    return reply.send({ data: await financeService.cashflow(query, request.user) });
  },
};
