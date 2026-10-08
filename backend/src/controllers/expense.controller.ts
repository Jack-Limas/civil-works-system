import { FastifyReply, FastifyRequest } from "fastify";
import { createExpenseSchema, listExpensesQuerySchema, reviewExpenseSchema } from "../schemas/expense.schema";
import { expenseService, SupportFile } from "../services/expense.service";
import { alertService } from "../services/alert.service";
import { projectAccess } from "../services/project-access.service";
import { assertValidSupportFile } from "../utils/file-validation";
import { AppError } from "../utils/app-error";

/**
 * Reads a multipart expense form: text fields plus an optional "support" file.
 * The file is fully validated before anything is uploaded.
 */
async function readMultipartExpense(request: FastifyRequest) {
  const fields: Record<string, string> = {};
  let support: SupportFile | null = null;

  for await (const part of request.parts()) {
    if (part.type === "file") {
      if (part.fieldname !== "support" || support) throw new AppError(400, "Only one support file is allowed");
      const buffer = await part.toBuffer();
      assertValidSupportFile(buffer, part.mimetype, part.file.truncated);
      support = { buffer, mimetype: part.mimetype };
    } else if (typeof part.value === "string") {
      fields[part.fieldname] = part.value;
    }
  }

  return { fields, support };
}

/** Rule alerts depend on executed spend; refreshing them must never fail the request. */
async function refreshAlerts(request: FastifyRequest, projectId: string) {
  try {
    await alertService.generateForProject(projectId);
  } catch (error) {
    request.log.warn({ err: error, projectId }, "Alert recalculation failed");
  }
}

export const expenseController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = listExpensesQuerySchema.parse(request.query);
    return reply.send(await expenseService.list(query, request.user));
  },

  /** Accepts JSON (original contract) or multipart/form-data with a support file. */
  async create(request: FastifyRequest, reply: FastifyReply) {
    let body: unknown = request.body;
    let support: SupportFile | null = null;

    if (request.isMultipart()) {
      const parsed = await readMultipartExpense(request);
      body = parsed.fields;
      support = parsed.support;
    }

    const input = createExpenseSchema.parse(body);
    const expense = await expenseService.create(input, support, request.user);
    if (expense.status === "APPROVED") await refreshAlerts(request, expense.projectId);

    return reply.code(201).send({ data: expense });
  },

  async review(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const input = reviewExpenseSchema.parse(request.body);
    const expense = await expenseService.review(request.params.id, input, request.user);
    if (expense.status === "APPROVED") await refreshAlerts(request, expense.projectId);

    return reply.send({ data: expense });
  },

  async indicators(request: FastifyRequest<{ Params: { projectId: string } }>, reply: FastifyReply) {
    await projectAccess.assert(request.user, request.params.projectId);
    const result = await expenseService.getBudgetIndicators(request.params.projectId);
    return reply.send({ data: result });
  },
};
