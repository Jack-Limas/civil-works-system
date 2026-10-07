import { apiClient } from "./api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface Activity {
  id: string;
  date: string;
  name: string;
  progressPercentage: number;
  responsible: { id: string; name: string };
  observations?: string | null;
}

export interface CreateActivityInput {
  projectId: string;
  date: string;
  name: string;
  progressPercentage: number;
  responsibleId: string;
  observations?: string;
}

export function useProjectActivities(projectId: string) {
  return useQuery({
    queryKey: ["activities", "list", projectId],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Activity[] }>("/activities", {
        params: { projectId },
      });
      return data.data;
    },
    enabled: !!projectId,
  });
}

export function useCreateActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateActivityInput) => {
      const { data } = await apiClient.post("/activities", input);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}