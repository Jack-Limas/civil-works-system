import { activityRepository } from "../repositories/activity.repository";
import { projectRepository } from "../repositories/project.repository";
import { CreateActivityInput, ListActivitiesQuery } from "../schemas/activity.schema";
import { RequestUser } from "../types/auth";
import { projectAccess } from "./project-access.service";

export const activityService = {
  async list(query: ListActivitiesQuery, requester: RequestUser) {
    if (query.projectId) await projectAccess.assert(requester, query.projectId);

    const skip = (query.page - 1) * query.limit;
    const [activities, total] = await activityRepository.findMany({
      projectId: query.projectId,
      responsibleId: projectAccess.scope(requester),
      skip,
      take: query.limit,
    });

    return {
      data: activities,
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  },

  async create(data: CreateActivityInput, requester: RequestUser) {
    await projectAccess.assert(requester, data.projectId);

    const lastActivity = await activityRepository.findLastByProject(data.projectId);
    const previousProgress = lastActivity?.progressPercentage ?? 0;
    const increment = data.progressPercentage - previousProgress;

    const activity = await activityRepository.create({ ...data, responsibleId: requester.sub });

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