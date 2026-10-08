import { createResourceHooks } from "./create-resource-hooks";

export interface Worker {
  id: string;
  name: string;
  documentId: string;
  position: string;
  projectId: string | null;
  status: "ACTIVE" | "INACTIVE";
  project?: { id: string; name: string } | null;
}

export interface CreateWorkerInput {
  name: string;
  documentId: string;
  position: string;
  projectId?: string;
}

export interface UpdateWorkerInput {
  position?: string;
  projectId?: string | null;
  status?: "ACTIVE" | "INACTIVE";
}

export const {
  useList: useWorkers,
  useCreate: useCreateWorker,
  useUpdate: useUpdateWorker,
} = createResourceHooks<Worker, CreateWorkerInput, UpdateWorkerInput>("workers", "/workers");
