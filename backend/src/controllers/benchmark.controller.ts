import { FastifyReply, FastifyRequest } from "fastify";
import { benchmarkService } from "../services/benchmark.service";

export const benchmarkController = {
  async mainThread(request: FastifyRequest, reply: FastifyReply) {
    const { size } = request.query as { size?: string };
    const result = benchmarkService.runOnMainThread(Number(size) || 4000);
    return reply.send({ data: result });
  },

  async workerThread(request: FastifyRequest, reply: FastifyReply) {
    const { size } = request.query as { size?: string };
    const result = await benchmarkService.runOnWorkerThread(Number(size) || 4000);
    return reply.send({ data: result });
  },
};