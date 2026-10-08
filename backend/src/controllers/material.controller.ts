import { FastifyReply, FastifyRequest } from "fastify";
import {
  createMaterialSchema,
  createMovementSchema,
  listMaterialsQuerySchema,
  listMovementsQuerySchema,
  materialDetailQuerySchema,
  updateMaterialSchema,
} from "../schemas/material.schema";
import { materialService } from "../services/material.service";

type IdParams = { Params: { id: string } };

export const materialController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = listMaterialsQuerySchema.parse(request.query);
    return reply.send(await materialService.list(query, request.user));
  },

  async summary(request: FastifyRequest, reply: FastifyReply) {
    return reply.send({ data: await materialService.summary(request.user) });
  },

  async detail(request: FastifyRequest<IdParams>, reply: FastifyReply) {
    const { days } = materialDetailQuerySchema.parse(request.query);
    return reply.send({ data: await materialService.detail(request.params.id, days, request.user) });
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const body = createMaterialSchema.parse(request.body);
    const material = await materialService.create(body, request.user);
    return reply.code(201).send({ data: material });
  },

  async update(request: FastifyRequest<IdParams>, reply: FastifyReply) {
    const body = updateMaterialSchema.parse(request.body);
    return reply.send({ data: await materialService.update(request.params.id, body) });
  },

  async registerMovement(request: FastifyRequest, reply: FastifyReply) {
    const body = createMovementSchema.parse(request.body);
    const result = await materialService.registerMovement(body, request.user);
    return reply.code(201).send({ data: result });
  },

  async listMovements(request: FastifyRequest, reply: FastifyReply) {
    const query = listMovementsQuerySchema.parse(request.query);
    return reply.send(await materialService.listMovements(query, request.user));
  },

  async lowStock(_request: FastifyRequest, reply: FastifyReply) {
    const materials = await materialService.getLowStockMaterials();
    return reply.send({ data: materials });
  },
};
