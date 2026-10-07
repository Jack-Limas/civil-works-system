import { apiClient } from "./api-client";
import { useQuery } from "@tanstack/react-query";

export interface Activity {
  id: string;
  date: string;
  name: string;
  progressPercentage: number;
  responsible: { id: string; name: string };
  observations?: string;
}

export function useProjectActivities(projectId: string) {
  return useQuery({
    queryKey: ["activities", "list", projectId],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Activity[] }>("/activities", { params: { projectId } });
      return data.data;
    },
    enabled: !!projectId,
  });
}