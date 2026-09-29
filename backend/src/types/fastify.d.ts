import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; role: "ADMIN" | "RESIDENT_ENGINEER" };
    user: { sub: string; role: "ADMIN" | "RESIDENT_ENGINEER" };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: any, reply: any) => Promise<void>;
    authorize: (roles: Array<"ADMIN" | "RESIDENT_ENGINEER">) => (request: any, reply: any) => Promise<void>;
  }
}