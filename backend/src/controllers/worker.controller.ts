import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { createWorkerSchema, updateWorkerSchema, listWorkersQuerySchema } from "../schemas/worker.schema";
import { workerService } from "../services/worker.service";

type WithId = FastifyRequest<{ Params: { id: string } }>;
const idParams = z.object({ id: z.string().uuid() });

export const workerController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = listWorkersQuerySchema.parse(request.query);
    return reply.send(await workerService.list(query, request.user));
  },

  async detail(request: WithId, reply: FastifyReply) {
    const { id } = idParams.parse(request.params);
    return reply.send({ data: await workerService.detail(id, request.user) });
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const body = createWorkerSchema.parse(request.body);
    const worker = await workerService.create(body, request.user);
    return reply.code(201).send({ data: worker });
  },

  async update(request: WithId, reply: FastifyReply) {
    const { id } = idParams.parse(request.params);
    const body = updateWorkerSchema.parse(request.body);
    return reply.send({ data: await workerService.update(id, body, request.user) });
  },

  async deactivate(request: WithId, reply: FastifyReply) {
    const { id } = idParams.parse(request.params);
    return reply.send({ data: await workerService.setStatus(id, "INACTIVE", request.user) });
  },

  async activate(request: WithId, reply: FastifyReply) {
    const { id } = idParams.parse(request.params);
    return reply.send({ data: await workerService.setStatus(id, "ACTIVE", request.user) });
  },
};
