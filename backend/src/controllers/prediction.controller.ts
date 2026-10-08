import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { predictionService, StrategyName } from "../services/prediction.service";
import { projectAccess } from "../services/project-access.service";

const generateSchema = z.object({
  strategy: z.enum(["RULE_BASED", "AI_GEMINI"]).default("RULE_BASED"),
});

export const predictionController = {
  async generate(request: FastifyRequest<{ Params: { projectId: string } }>, reply: FastifyReply) {
    await projectAccess.assert(request.user, request.params.projectId);
    const body = generateSchema.parse(request.body ?? {});
    const result = await predictionService.generate(request.params.projectId, body.strategy as StrategyName);
    return reply.code(201).send({ data: result });
  },

  async history(request: FastifyRequest<{ Params: { projectId: string } }>, reply: FastifyReply) {
    await projectAccess.assert(request.user, request.params.projectId);
    const data = await predictionService.history(request.params.projectId);
    return reply.send({ data });
  },

  async compare(request: FastifyRequest<{ Params: { projectId: string } }>, reply: FastifyReply) {
    await projectAccess.assert(request.user, request.params.projectId);
    const data = await predictionService.compareStrategies(request.params.projectId);
    return reply.send({ data });
  },
};