import "@fastify/jwt";
import { FastifyReply, FastifyRequest } from "fastify";
import { RequestUser, Role, TokenPayload } from "./auth";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: TokenPayload;
    user: RequestUser;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authorize: (roles: Role[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
