import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./api-client";
import { DashboardSummary } from "@/types/dashboard";

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: DashboardSummary }>("/dashboard/summary");
      return data.data;
    },
  });
}
