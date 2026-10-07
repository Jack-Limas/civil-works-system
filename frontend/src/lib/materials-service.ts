import { apiClient } from "./api-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Material {
  id: string;
  name: string;
  unit: string;
  stockAvailable: number;
  stockMinimum: number;
}

export interface LowStockMaterial {
  id: string;
  name: string;
  unit: string;
  stockAvailable: number;
  stockMinimum: number;
}

export function useMaterials() {
  return useQuery({
    queryKey: ["materials", "list"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Material[] }>("/materials");
      return data;
    },
  });
}

export function useCreateMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<Material, "id" | "stockAvailable">) => {
      const { data } = await apiClient.post("/materials", payload);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["materials"] }),
  });
}

export function useLowStockMaterials() {
  return useQuery({
    queryKey: ["materials", "low-stock"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: LowStockMaterial[] }>(
        "/materials/low-stock"
      );
      return data.data;
    },
  });
}