import { apiClient } from "./api-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Incident {
  id: string;
  projectId: string;
  type: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  description: string;
  status: string;
}

export function useIncidents() {
  return useQuery({
    queryKey: ["incidents", "list"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Incident[] }>("/incidents");
      return data;
    },
  });
}

export function useCreateIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<Incident, "id" | "status">) => {
      const { data } = await apiClient.post("/incidents", payload);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["incidents"] }),
  });
}