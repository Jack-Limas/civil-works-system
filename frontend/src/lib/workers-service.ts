import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";
import { createResourceHooks } from "./create-resource-hooks";

export const WORKER_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type WorkerStatus = (typeof WORKER_STATUSES)[number];

export interface Worker {
  id: string;
  name: string;
  /** Only sent to admins (sensitive personal data) */
  documentId?: string;
  /** Only sent to admins (sensitive personal data) */
  phone?: string | null;
  /** Trade (oficio) */
  position: string;
  projectId: string | null;
  status: WorkerStatus;
  createdAt?: string;
  project?: { id: string; name: string } | null;
}

export interface WorkerKpis {
  active: number;
  inactive: number;
  unassigned: number;
  positions: Array<{ position: string; count: number }>;
}

export interface WorkerFilters {
  projectId?: string;
  assignment?: "none";
  position?: string;
  status?: WorkerStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateWorkerInput {
  name: string;
  documentId: string;
  position: string;
  projectId?: string;
  phone?: string;
}

export interface UpdateWorkerInput {
  name?: string;
  documentId?: string;
  position?: string;
  projectId?: string | null;
  phone?: string | null;
  status?: WorkerStatus;
}

export const {
  useList: useWorkers,
  useCreate: useCreateWorker,
  useUpdate: useUpdateWorker,
} = createResourceHooks<Worker, CreateWorkerInput, UpdateWorkerInput>("workers", "/workers");

export function useWorkerDirectory(filters: WorkerFilters) {
  return useQuery({
    queryKey: ["workers", "directory", filters],
    queryFn: async () => {
      const { data } = await apiClient.get<{
        data: Worker[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
        summary: WorkerKpis;
      }>("/workers", { params: filters });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useSetWorkerActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { data } = await apiClient.post<{ data: Worker }>(`/workers/${id}/${active ? "activate" : "deactivate"}`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workers"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}
