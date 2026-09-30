import { activityRepository } from "../repositories/activity.repository";
import { projectRepository } from "../repositories/project.repository";
import { CreateActivityInput, ListActivitiesQuery } from "../schemas/activity.schema";
import { AppError } from "../utils/app-error";

export const activityService = {
  async list(query: ListActivitiesQuery) {
    const skip = (query.page - 1) * query.limit;
    const [activities, total] = await activityRepository.findMany({
      projectId: query.projectId,
      skip,
      take: query.limit,
    });

    return {
      data: activities,
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  },

  async create(data: CreateActivityInput) {
    const project = await projectRepository.findById(data.projectId);
    if (!project) throw new AppError(404, "Project not found");

    const lastActivity = await activityRepository.findLastByProject(data.projectId);
    const previousProgress = lastActivity?.progressPercentage ?? 0;
    const increment = data.progressPercentage - previousProgress;

    const activity = await activityRepository.create(data);

    // Regla de negocio: la actividad más reciente define el avance oficial de la obra
    await projectRepository.update(data.projectId, {
      progressPercentage: data.progressPercentage,
    });

    return {
      activity,
      progressSummary: {
        previousProgress,
        currentProgress: data.progressPercentage,
        increment: Number(increment.toFixed(2)),
      },
    };
  },
};