import { FastifyReply, FastifyRequest } from "fastify";
import {
  createMaterialSchema,
  createMovementSchema,
  listMaterialsQuerySchema,
} from "../schemas/material.schema";
import { materialService } from "../services/material.service";

export const materialController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = listMaterialsQuerySchema.parse(request.query);
    const result = await materialService.list(query);
    return reply.send(result);
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const body = createMaterialSchema.parse(request.body);
    const material = await materialService.create(body);
    return reply.code(201).send({ data: material });
  },

  async registerMovement(request: FastifyRequest, reply: FastifyReply) {
    const body = createMovementSchema.parse(request.body);
    const result = await materialService.registerMovement(body);
    return reply.code(201).send({ data: result });
  },

  async lowStock(request: FastifyRequest, reply: FastifyReply) {
    const materials = await materialService.getLowStockMaterials();
    return reply.send({ data: materials });
  },
};