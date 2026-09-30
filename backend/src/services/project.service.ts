import { projectRepository } from "../repositories/project.repository";
import { userRepository } from "../repositories/user.repository";
import { CreateProjectInput, UpdateProjectInput, ListProjectsQuery } from "../schemas/project.schema";
import { AppError } from "../utils/app-error";

type RequestUser = { sub: string; role: "ADMIN" | "RESIDENT_ENGINEER" };

export const projectService = {
  async list(query: ListProjectsQuery, requester: RequestUser) {
    const skip = (query.page - 1) * query.limit;

    // Un ingeniero residente solo ve las obras donde es responsable
    const responsibleId = requester.role === "RESIDENT_ENGINEER" ? requester.sub : undefined;

    const [projects, total] = await projectRepository.findMany({
      status: query.status,
      responsibleId,
      skip,
      take: query.limit,
    });

    return {
      data: projects,
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  },

  async getById(id: string, requester: RequestUser) {
    const project = await projectRepository.findById(id);
    if (!project) throw new AppError(404, "Project not found");

    if (requester.role === "RESIDENT_ENGINEER" && project.responsibleId !== requester.sub) {
      throw new AppError(403, "You don't have access to this project");
    }

    return project;
  },

  async create(data: CreateProjectInput) {
    const responsible = await userRepository.findById(data.responsibleId);
    if (!responsible) throw new AppError(400, "Responsible user does not exist");

    if (data.estimatedEndDate <= data.startDate) {
      throw new AppError(400, "Estimated end date must be after start date");
    }

    return projectRepository.create(data);
  },

  async update(id: string, data: UpdateProjectInput) {
    const existing = await projectRepository.findById(id);
    if (!existing) throw new AppError(404, "Project not found");

    return projectRepository.update(id, data);
  },

  async remove(id: string) {
    const existing = await projectRepository.findById(id);
    if (!existing) throw new AppError(404, "Project not found");

    return projectRepository.delete(id);
  },
};