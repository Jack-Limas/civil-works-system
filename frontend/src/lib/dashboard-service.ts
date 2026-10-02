import { apiClient } from "./api-client";
import { DashboardSummary } from "@/types/dashboard";

export const dashboardService = {
  async getSummary() {
    const { data } = await apiClient.get<{ data: DashboardSummary }>("/dashboard/summary");
    return data.data;
  },
};