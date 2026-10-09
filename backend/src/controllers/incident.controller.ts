import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  changeIncidentStatusSchema,
  createIncidentSchema,
  listIncidentsQuerySchema,
  updateIncidentSchema,
} from "../schemas/incident.schema";
import { incidentService } from "../services/incident.service";

type WithId = FastifyRequest<{ Params: { id: string } }>;
const idParams = z.object({ id: z.string().uuid() });

export const incidentController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = listIncidentsQuerySchema.parse(request.query);
    return reply.send(await incidentService.list(query, request.user));
  },

  async detail(request: WithId, reply: FastifyReply) {
    const { id } = idParams.parse(request.params);
    return reply.send({ data: await incidentService.detail(id, request.user) });
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const body = createIncidentSchema.parse(request.body);
    const incident = await incidentService.create(body, request.user);
    return reply.code(201).send({ data: incident });
  },

  async update(request: WithId, reply: FastifyReply) {
    const { id } = idParams.parse(request.params);
    const body = updateIncidentSchema.parse(request.body);
    return reply.send({ data: await incidentService.update(id, body, request.user) });
  },

  async changeStatus(request: WithId, reply: FastifyReply) {
    const { id } = idParams.parse(request.params);
    const body = changeIncidentStatusSchema.parse(request.body);
    return reply.send({ data: await incidentService.changeStatus(id, body, request.user) });
  },
};
