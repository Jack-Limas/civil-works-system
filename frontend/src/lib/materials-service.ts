import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";
import type { Paginated } from "@/types/finance";
import type {
  CreateMaterialInput,
  CreateMovementInput,
  InventoryMaterial,
  InventoryMovement,
  InventorySummary,
  MaterialDetail,
  MaterialFilters,
  MovementFilters,
  MovementResult,
  UpdateMaterialInput,
} from "@/types/inventory";

/** @deprecated kept for older screens; InventoryMaterial is the analyzed shape. */
export type Material = InventoryMaterial;

/** Every view that depends on stock: inventory, reports, dashboard KPIs, assistant. */
function invalidateInventory(queryClient: ReturnType<typeof useQueryClient>) {
  for (const key of ["materials", "inventory", "reports", "dashboard", "expenses", "finance"]) {
    queryClient.invalidateQueries({ queryKey: [key] });
  }
}

export function useMaterials(filters: MaterialFilters = {}) {
  return useQuery({
    queryKey: ["materials", "list", filters],
    queryFn: async () => {
      const { data } = await apiClient.get<Paginated<InventoryMaterial>>("/materials", { params: filters });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useInventorySummary() {
  return useQuery({
    queryKey: ["materials", "summary"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: InventorySummary }>("/materials/summary");
      return data.data;
    },
  });
}

export function useMaterialDetail(id: string, days: 30 | 90) {
  return useQuery({
    queryKey: ["materials", "detail", id, days],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: MaterialDetail }>(`/materials/${id}`, { params: { days } });
      return data.data;
    },
    enabled: !!id,
    placeholderData: keepPreviousData,
  });
}

export function useLowStockMaterials() {
  return useQuery({
    queryKey: ["materials", "low-stock"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: InventoryMaterial[] }>("/materials/low-stock");
      return data.data;
    },
  });
}

export function useCreateMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMaterialInput) => {
      const { data } = await apiClient.post<{ data: InventoryMaterial }>("/materials", input);
      return data.data;
    },
    onSuccess: () => invalidateInventory(queryClient),
  });
}

export function useUpdateMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateMaterialInput }) => {
      const { data } = await apiClient.patch<{ data: InventoryMaterial }>(`/materials/${id}`, input);
      return data.data;
    },
    onSuccess: () => invalidateInventory(queryClient),
  });
}

export function useMovements(filters: MovementFilters, enabled = true) {
  return useQuery({
    queryKey: ["inventory", "movements", filters],
    queryFn: async () => {
      const { data } = await apiClient.get<Paginated<InventoryMovement>>("/materials/movements", { params: filters });
      return data;
    },
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useRegisterMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMovementInput) => {
      const { data } = await apiClient.post<{ data: MovementResult }>("/materials/movements", input);
      return data.data;
    },
    onSuccess: () => invalidateInventory(queryClient),
  });
}
