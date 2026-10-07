import { useQuery } from "@tanstack/react-query";
import { createResourceHooks } from "./create-resource-hooks";
import { apiClient } from "./api-client";

export interface Project {
  id: string;
  name: string;
  type: string;
  municipality: string;
  address?: string | null;
  status: "PLANNED" | "IN_PROGRESS" | "SUSPENDED" | "FINISHED";
  progressPercentage: number;
  budget: number;
  startDate: string;
  estimatedEndDate: string;
  responsible: { id: string; name: string };
}

export interface CreateProjectInput {
  name: string;
  type: string;
  municipality: string;
  startDate: string;
  estimatedEndDate: string;
  budget: number;
  responsibleId: string;
}

export interface UpdateProjectInput {
  name?: string;
  status?: "PLANNED" | "IN_PROGRESS" | "SUSPENDED" | "FINISHED";
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