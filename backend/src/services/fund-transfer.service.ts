import { Prisma } from "@prisma/client";
import { fundTransferRepository } from "../repositories/fund-transfer.repository";
import { projectRepository } from "../repositories/project.repository";
import { userRepository } from "../repositories/user.repository";
import { CreateFundTransferInput, ListFundTransfersQuery } from "../schemas/fund-transfer.schema";
import { AppError } from "../utils/app-error";
import { RequestUser } from "../types/auth";

export const fundTransferService = {
  /** Admin: every transfer (optionally filtered). Resident: only transfers they received. */
  async list(query: ListFundTransfersQuery, requester: RequestUser) {
    const residentId = requester.role === "ADMIN" ? query.residentId : requester.sub;
    const where: Prisma.FundTransferWhereInput = {
      ...(residentId && { residentId }),
      ...(query.projectId && { projectId: query.projectId }),
    };

    const skip = (query.page - 1) * query.limit;
    const [transfers, total] = await fundTransferRepository.findMany(where, skip, query.limit);
    return {
      data: transfers,
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  },

  /** Only admins create transfers (enforced by the route); the recipient must be a resident. */
  async create(input: CreateFundTransferInput, requester: RequestUser) {
    const resident = await userRepository.findById(input.residentId);
    if (!resident) throw new AppError(404, "Resident not found");
    if (resident.role !== "RESIDENT_ENGINEER") {
      throw new AppError(400, "Funds can only be transferred to resident engineers");
    }
    if (input.projectId && !(await projectRepository.findById(input.projectId))) {
      throw new AppError(404, "Project not found");
    }

    return fundTransferRepository.create({ ...input, createdById: requester.sub });
  },
};
