import { apiClient } from "./api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface Alert {
  id: string;
  type: "SCHEDULE" | "FINANCIAL" | "ACTIVITY" | "INVENTORY";
  message: string;
  /** Numbers behind the rule, used to render the message in any language */
  params?: Record<string, number> | null;
  severity: "LOW" | "MEDIUM" | "HIGH";
  status: "ACTIVE" | "RESOLVED";
  project: { id: string; name: string };
  createdAt: string;
}

export function useAlerts(status?: "ACTIVE" | "RESOLVED") {
  return useQuery({
    queryKey: ["alerts", status],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Alert[] }>("/alerts", {
        params: { status },
      });
      return data.data;
    },
  });
}

export interface GenerateAlertsResult {
  projectsAnalyzed: number;
  projectsWithNewAlerts: number;
  details: Array<{ projectId: string; projectName: string; alertsCreated: number }>;
}

export function useGenerateAlerts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<{ data: GenerateAlertsResult }>("/alerts/generate");
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/alerts/${id}/resolve`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });
}