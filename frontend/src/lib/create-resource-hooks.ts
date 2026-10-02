import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";

interface PaginatedResponse<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export function createResourceHooks<T, CreateInput, UpdateInput = Partial<CreateInput>>(
  resourceKey: string,
  endpoint: string
) {
  function useList(params?: Record<string, string | number | undefined>) {
    return useQuery({
      queryKey: [resourceKey, "list", params],
      queryFn: async () => {
        const { data } = await apiClient.get<PaginatedResponse<T>>(endpoint, { params });
        return data;
      },
    });
  }

  function useCreate() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (input: CreateInput) => {
        const { data } = await apiClient.post(endpoint, input);
        return data.data as T;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: [resourceKey] }),
    });
  }

  function useUpdate() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async ({ id, input }: { id: string; input: UpdateInput }) => {
        const { data } = await apiClient.patch(`${endpoint}/${id}`, input);
        return data.data as T;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: [resourceKey] }),
    });
  }

  function useRemove() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (id: string) => {
        await apiClient.delete(`${endpoint}/${id}`);
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: [resourceKey] }),
    });
  }

  return { useList, useCreate, useUpdate, useRemove };
}