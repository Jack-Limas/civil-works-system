import { projectRepository } from "../repositories/project.repository";
import { AppError } from "../utils/app-error";
import { RequestUser } from "../types/auth";

/**
 * Single source of truth for project ownership rules.
 * ADMIN sees every project; RESIDENT_ENGINEER only the projects where they are
 * the responsible user. Every service that touches project-scoped data goes
 * through these helpers instead of re-implementing the check.
 */
export const projectAccess = {
  isAdmin(user: RequestUser) {
    return user.role === "ADMIN";
  },

  /** responsibleId filter to apply on list queries (undefined = no restriction). */
  scope(user: RequestUser): string | undefined {
    return user.role === "ADMIN" ? undefined : user.sub;
  },

  /** Loads the project or fails with 404/403 depending on existence and ownership. */
  async assert(user: RequestUser, projectId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) throw new AppError(404, "Project not found");

    if (user.role !== "ADMIN" && project.responsibleId !== user.sub) {
      throw new AppError(403, "You don't have access to this project");
    }

    return project;
  },
};
