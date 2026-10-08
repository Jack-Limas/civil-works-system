import { projectRepository } from "../repositories/project.repository";
import { userRepository } from "../repositories/user.repository";
import { CreateProjectInput, UpdateProjectInput, ListProjectsQuery } from "../schemas/project.schema";
import { AppError } from "../utils/app-error";
import { RequestUser } from "../types/auth";
import { projectAccess } from "./project-access.service";

export const projectService = {
  async list(query: ListProjectsQuery, requester: RequestUser) {
    const skip = (query.page - 1) * query.limit;

    const [projects, total] = await projectRepository.findMany({
      status: query.status,
      responsibleId: projectAccess.scope(requester),
      skip,
      take: query.limit,
    });

    return {
      data: projects,
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  },

  async getById(id: string, requester: RequestUser) {
    return projectAccess.assert(requester, id);
  },

  async create(data: CreateProjectInput) {
    const responsible = await userRepository.findById(data.responsibleId);
    if (!responsible) throw new AppError(400, "Responsible user does not exist");

    if (data.estimatedEndDate <= data.startDate) {
      throw new AppError(400, "Estimated end date must be after start date");
    }

    return projectRepository.create(data);
  },

  async update(id: string, data: UpdateProjectInput, requester: RequestUser) {
    await projectAccess.assert(requester, id);
    return projectRepository.update(id, data);
  },

  async remove(id: string, requester: RequestUser) {
    await projectAccess.assert(requester, id);
    return projectRepository.delete(id);
  },
};
