import { FastifyReply, FastifyRequest } from "fastify";
import { createWorkerSchema, updateWorkerSchema, listWorkersQuerySchema } from "../schemas/worker.schema";
import { workerService } from "../services/worker.service";

export const workerController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = listWorkersQuerySchema.parse(request.query);
    const result = await workerService.list(query, request.user);
    return reply.send(result);
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const body = createWorkerSchema.parse(request.body);
    const worker = await workerService.create(body);
    return reply.code(201).send({ data: worker });
  },

  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const body = updateWorkerSchema.parse(request.body);
    const worker = await workerService.update(request.params.id, body);
    return reply.send({ data: worker });
  },
};