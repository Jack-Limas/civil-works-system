import { FastifyReply, FastifyRequest } from "fastify";
import { updateSettingsSchema } from "../schemas/settings.schema";
import { settingsService } from "../services/settings.service";

export const settingsController = {
  async get(_request: FastifyRequest, reply: FastifyReply) {
    return reply.send({ data: await settingsService.describe() });
  },

  /** The only setting any signed-in user needs (printed report header). */
  async getPublic(_request: FastifyRequest, reply: FastifyReply) {
    const { companyName } = await settingsService.get();
    return reply.send({ data: { companyName } });
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    const body = updateSettingsSchema.parse(request.body);
    return reply.send({ data: await settingsService.update(body, request.user) });
  },

  async reset(request: FastifyRequest, reply: FastifyReply) {
    return reply.send({ data: await settingsService.reset(request.user) });
  },
};
