import { FastifyReply, FastifyRequest } from "fastify";
import { createProjectSchema, updateProjectSchema, listProjectsQuerySchema } from "../schemas/project.schema";
import { projectService } from "../services/project.service";

type RequestUser = { sub: string; role: "ADMIN" | "RESIDENT_ENGINEER" };

export const projectController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = listProjectsQuerySchema.parse(request.query);
    const result = await projectService.list(query, request.user as RequestUser);
    return reply.send(result);
  },

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const project = await projectService.getById(request.params.id, request.user as RequestUser);
    return reply.send({ data: project });
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const body = createProjectSchema.parse(request.body);
    const project = await projectService.create(body);
    return reply.code(201).send({ data: project });
  },

  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const body = updateProjectSchema.parse(request.body);
    const project = await projectService.update(request.params.id, body);
    return reply.send({ data: project });
  },

  async remove(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    await projectService.remove(request.params.id);
    return reply.code(204).send();
  },
};