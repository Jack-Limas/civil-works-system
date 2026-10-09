import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { createUserSchema, listUsersQuerySchema, updateUserSchema } from "../schemas/user.schema";
import { userService } from "../services/user.service";

type WithId = FastifyRequest<{ Params: { id: string } }>;
const idParams = z.object({ id: z.string().uuid() });

/** Temporary passwords travel only in these responses: never cache them anywhere. */
function noStore(reply: FastifyReply) {
  return reply.header("Cache-Control", "no-store");
}

export const userController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = listUsersQuerySchema.parse(request.query);
    return reply.send(await userService.search(query));
  },

  async detail(request: WithId, reply: FastifyReply) {
    const { id } = idParams.parse(request.params);
    return reply.send({ data: await userService.detail(id) });
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const body = createUserSchema.parse(request.body);
    const result = await userService.create(body, request.user);
    return noStore(reply).code(201).send({ data: result.user, temporaryPassword: result.temporaryPassword });
  },

  async update(request: WithId, reply: FastifyReply) {
    const { id } = idParams.parse(request.params);
    const body = updateUserSchema.parse(request.body);
    return reply.send({ data: await userService.update(id, body, request.user) });
  },

  async deactivate(request: WithId, reply: FastifyReply) {
    const { id } = idParams.parse(request.params);
    return reply.send({ data: await userService.deactivate(id, request.user) });
  },

  async activate(request: WithId, reply: FastifyReply) {
    const { id } = idParams.parse(request.params);
    return reply.send({ data: await userService.activate(id, request.user) });
  },

  async resetPassword(request: WithId, reply: FastifyReply) {
    const { id } = idParams.parse(request.params);
    const result = await userService.resetPassword(id, request.user);
    return noStore(reply).send(result);
  },
};
