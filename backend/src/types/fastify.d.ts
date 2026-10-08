import "@fastify/jwt";
import { FastifyReply, FastifyRequest } from "fastify";
import { RequestUser, Role } from "./auth";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: RequestUser;
    user: RequestUser;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authorize: (roles: Role[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
