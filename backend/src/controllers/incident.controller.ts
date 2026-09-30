import { FastifyReply, FastifyRequest } from "fastify";
import { createIncidentSchema, updateIncidentSchema, listIncidentsQuerySchema } from "../schemas/incident.schema";
import { incidentService } from "../services/incident.service";

export const incidentController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = listIncidentsQuerySchema.parse(request.query);
    const result = await incidentService.list(query);
    return reply.send(result);
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const body = createIncidentSchema.parse(request.body);
    const incident = await incidentService.create(body);
    return reply.code(201).send({ data: incident });
  },

  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const body = updateIncidentSchema.parse(request.body);
    const incident = await incidentService.update(request.params.id, body);
    return reply.send({ data: incident });
  },
};