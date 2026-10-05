import { apiClient } from "./api-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Expense {
  id: string;
  projectId: string;
  category: string;
  amount: number;
  description: string;
  createdAt?: string;
}

export function useExpenses() {
  return useQuery({
    queryKey: ["expenses", "list"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Expense[] }>("/expenses");
      return data;
    },
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<Expense, "id">) => {
      const { data } = await apiClient.post("/expenses", payload);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] }),
  });
}