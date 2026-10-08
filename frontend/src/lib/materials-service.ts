import { apiClient } from "./api-client";
import { useQuery } from "@tanstack/react-query";
import { createResourceHooks } from "./create-resource-hooks";

export interface Material {
  id: string;
  name: string;
  unit: string;
  stockAvailable: number;
  stockMinimum: number;
}

export interface CreateMaterialInput {
  name: string;
  unit: string;
  stockMinimum: number;
}

export const { useList: useMaterials, useCreate: useCreateMaterial } = createResourceHooks<
  Material,
  CreateMaterialInput
>("materials", "/materials");

export function useLowStockMaterials() {
  return useQuery({
    queryKey: ["materials", "low-stock"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Material[] }>("/materials/low-stock");
      return data.data;
    },
  });
}
