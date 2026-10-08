import { FastifyReply, FastifyRequest } from "fastify";
import { createFundTransferSchema, listFundTransfersQuerySchema } from "../schemas/fund-transfer.schema";
import { fundTransferService } from "../services/fund-transfer.service";
import { cashService } from "../services/cash.service";

export const cashController = {
  async listTransfers(request: FastifyRequest, reply: FastifyReply) {
    const query = listFundTransfersQuerySchema.parse(request.query);
    return reply.send(await fundTransferService.list(query, request.user));
  },

  async createTransfer(request: FastifyRequest, reply: FastifyReply) {
    const input = createFundTransferSchema.parse(request.body);
    const transfer = await fundTransferService.create(input, request.user);
    return reply.code(201).send({ data: transfer });
  },

  async balances(request: FastifyRequest, reply: FastifyReply) {
    return reply.send({ data: await cashService.balances(request.user) });
  },
};
