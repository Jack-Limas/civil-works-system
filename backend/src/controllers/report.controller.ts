import { FastifyReply, FastifyRequest } from "fastify";
import { reportQuerySchema, reportSummarySchema, reportTypeParamsSchema } from "../schemas/report.schema";
import { reportService } from "../services/report.service";
import { reportSummaryService } from "../services/report-summary.service";
import { setServerTiming } from "../utils/report-meta";

export const reportController = {
  async generate(request: FastifyRequest<{ Params: { type: string } }>, reply: FastifyReply) {
    const { type } = reportTypeParamsSchema.parse(request.params);
    const query = reportQuerySchema.parse(request.query);
    const report = await reportService.generate(type, query, request.user);
    setServerTiming(reply, `report-${type}`, report.meta);
    return reply.send({ data: report });
  },

  async summary(request: FastifyRequest, reply: FastifyReply) {
    const input = reportSummarySchema.parse(request.body);
    return reply.send({ data: await reportSummaryService.summarize(input, request.user) });
  },
};
