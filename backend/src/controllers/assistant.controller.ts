import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { assistantService } from "../services/assistant.service";

const askSchema = z.object({ question: z.string().min(3).max(500) });

export const assistantController = {
  async ask(request: FastifyRequest, reply: FastifyReply) {
    const { question } = askSchema.parse(request.body);
    const answer = await assistantService.ask(question);
    return reply.send({ data: { answer } });
  },
};