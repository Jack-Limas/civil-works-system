import { apiClient } from "./api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface Prediction {
  id: string;
  type: string;
  resultJson: { level: string; reasoning: string; source: string; params?: Record<string, number> };
  confidence: number | null;
  generatedAt: string;
}

export function usePredictions(projectId: string) {
  return useQuery({
    queryKey: ["predictions", projectId],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Prediction[] }>(
        `/predictions/project/${projectId}`
      );
      return data.data;
    },
    enabled: !!projectId,
  });
}

export function useGeneratePrediction(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (strategy: "RULE_BASED" | "AI_GEMINI") => {
      await apiClient.post(`/predictions/generate/${projectId}`, { strategy });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["predictions", projectId] }),
  });
}