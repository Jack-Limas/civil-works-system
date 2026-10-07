import { createResourceHooks } from "./create-resource-hooks";

export interface Project {
  id: string;
  name: string;
  type: string;
  municipality: string;
  status: "PLANNED" | "IN_PROGRESS" | "SUSPENDED" | "FINISHED";
  progressPercentage: number;
  budget: number;
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