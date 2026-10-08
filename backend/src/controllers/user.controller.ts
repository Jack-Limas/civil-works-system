import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { userService } from "../services/user.service";

const listUsersQuerySchema = z.object({
  role: z.enum(["ADMIN", "RESIDENT_ENGINEER"]).optional(),
});

export const userController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const { role } = listUsersQuerySchema.parse(request.query);
    const users = await userService.list(role);
    return reply.send({ data: users });
  },
};
