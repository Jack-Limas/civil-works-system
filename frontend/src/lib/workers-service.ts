import { apiClient } from "./api-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Worker {
  id: string;
  name: string;
  documentId: string;
  position: string;
  projectId?: string;
  project?: { name: string };
}

export function useWorkers() {
  return useQuery({
    queryKey: ["workers", "list"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Worker[] }>("/workers");
      return data;
    },
  });
}

export function useCreateWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<Worker, "id">) => {
      const { data } = await apiClient.post("/workers", payload);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workers"] }),
  });
}