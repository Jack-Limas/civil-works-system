import { FastifyReply, FastifyRequest } from "fastify";
import { createActivitySchema, listActivitiesQuerySchema } from "../schemas/activity.schema";
import { activityService } from "../services/activity.service";

export const activityController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = listActivitiesQuerySchema.parse(request.query);
    const result = await activityService.list(query, request.user);
    return reply.send(result);
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const body = createActivitySchema.parse(request.body);
    const result = await activityService.create(body, request.user);
    return reply.code(201).send({ data: result });
  },
};