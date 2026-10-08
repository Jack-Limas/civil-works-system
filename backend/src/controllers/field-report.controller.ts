import { FastifyReply, FastifyRequest } from "fastify";
import {
  compileQuerySchema,
  createFieldReportSchema,
  listFieldReportsQuerySchema,
  reviewFieldReportSchema,
  updateFieldReportSchema,
} from "../schemas/field-report.schema";
import { fieldReportService } from "../services/field-report.service";

type IdParams = { Params: { id: string } };

export const fieldReportController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = listFieldReportsQuerySchema.parse(request.query);
    return reply.send(await fieldReportService.list(query, request.user));
  },

  async compile(request: FastifyRequest, reply: FastifyReply) {
    const { projectId, date } = compileQuerySchema.parse(request.query);
    return reply.send({ data: await fieldReportService.compileForForm(projectId, date, request.user) });
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const input = createFieldReportSchema.parse(request.body);
    return reply.code(201).send({ data: await fieldReportService.create(input, request.user) });
  },

  async detail(request: FastifyRequest<IdParams>, reply: FastifyReply) {
    return reply.send({ data: await fieldReportService.detail(request.params.id, request.user) });
  },

  async update(request: FastifyRequest<IdParams>, reply: FastifyReply) {
    const input = updateFieldReportSchema.parse(request.body);
    return reply.send({ data: await fieldReportService.update(request.params.id, input, request.user) });
  },

  async review(request: FastifyRequest<IdParams>, reply: FastifyReply) {
    const { note } = reviewFieldReportSchema.parse(request.body ?? {});
    return reply.send({ data: await fieldReportService.review(request.params.id, note, request.user) });
  },
};
