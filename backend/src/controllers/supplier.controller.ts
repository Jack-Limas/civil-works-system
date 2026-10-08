import { FastifyReply, FastifyRequest } from "fastify";
import { createSupplierSchema, listSuppliersQuerySchema, updateSupplierSchema } from "../schemas/supplier.schema";
import { supplierService } from "../services/supplier.service";

type IdParams = { Params: { id: string } };

export const supplierController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = listSuppliersQuerySchema.parse(request.query);
    return reply.send(await supplierService.list(query));
  },

  async stats(_request: FastifyRequest, reply: FastifyReply) {
    return reply.send({ data: await supplierService.stats() });
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const body = createSupplierSchema.parse(request.body);
    const supplier = await supplierService.create(body, request.user);
    return reply.code(201).send({ data: supplier });
  },

  async update(request: FastifyRequest<IdParams>, reply: FastifyReply) {
    const body = updateSupplierSchema.parse(request.body);
    return reply.send({ data: await supplierService.update(request.params.id, body) });
  },

  async remove(request: FastifyRequest<IdParams>, reply: FastifyReply) {
    await supplierService.remove(request.params.id);
    return reply.code(204).send();
  },
};
