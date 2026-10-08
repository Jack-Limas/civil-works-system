import { useQuery } from "@tanstack/react-query";
import { createResourceHooks } from "./create-resource-hooks";
import { apiClient } from "./api-client";

export const PROJECT_STATUSES = ["PLANNED", "IN_PROGRESS", "SUSPENDED", "FINISHED"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_TYPES = [
  "RESIDENTIAL_BUILDING",
  "COMMERCIAL_BUILDING",
  "ROAD",
  "BRIDGE",
  "SCHOOL",
  "HEALTH_CENTER",
  "WAREHOUSE",
  "REMODELING",
  "STADIUM",
  "POOL",
  "SYNTHETIC_FIELD",
  "RETAINING_WALL",
  "PRIVATE_WORK",
  "OTHER",
] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  municipality: string;
  address?: string | null;
  status: ProjectStatus;
  progressPercentage: number;
  /** Prisma Decimal serialized as string */
  budget: number | string;
  responsibleId: string;
  startDate: string;
  estimatedEndDate: string;
  responsible: { id: string; name: string };
}

export interface CreateProjectInput {
  name: string;
  type: ProjectType;
  municipality: string;
  startDate: string;
  estimatedEndDate: string;
  budget: number;
  responsibleId: string;
  address?: string;
}

export interface UpdateProjectInput {
  name?: string;
  status?: ProjectStatus;
  progressPercentage?: number;
  budget?: number;
  estimatedEndDate?: string;
}

export const {
  useList: useProjects,
  useCreate: useCreateProject,
  useUpdate: useUpdateProject,
  useRemove: useRemoveProject,
} = createResourceHooks<Project, CreateProjectInput, UpdateProjectInput>(
  "projects",
  "/projects"
);

export function useProject(id: string) {
  return useQuery({
    queryKey: ["projects", "detail", id],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Project }>(`/projects/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}