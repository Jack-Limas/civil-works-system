import { FastifyReply, FastifyRequest } from "fastify";
import { createExpenseSchema, listExpensesQuerySchema } from "../schemas/expense.schema";
import { expenseService } from "../services/expense.service";

export const expenseController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = listExpensesQuerySchema.parse(request.query);
    const result = await expenseService.list(query);
    return reply.send(result);
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const body = createExpenseSchema.parse(request.body);
    const expense = await expenseService.create(body);
    return reply.code(201).send({ data: expense });
  },

  async indicators(request: FastifyRequest<{ Params: { projectId: string } }>, reply: FastifyReply) {
    const result = await expenseService.getBudgetIndicators(request.params.projectId);
    return reply.send({ data: result });
  },
};