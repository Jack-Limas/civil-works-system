import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";

export interface Expense {
  id: string;
  projectId: string;
  category: string;
  amount: number;
  description: string;
  createdAt?: string;
}

export interface BudgetIndicators {
  budget: number;
  executedExpenses: number;
  availableBudget: number;
  executedPercentage: number;
  physicalProgress: number;
  financialVsPhysicalGap: number;
}

export interface ExpenseItem {
  id: string;
  category: string;
  amount: number | string;
  date: string;
  description?: string | null;
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

export function useBudgetIndicators(projectId: string) {
  return useQuery({
    queryKey: ["expenses", "indicators", projectId],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: BudgetIndicators }>(
        `/expenses/project/${projectId}/indicators`
      );
      return data.data;
    },
    enabled: !!projectId,
  });
}

export function useProjectExpenses(projectId: string) {
  return useQuery({
    queryKey: ["expenses", "project", projectId],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: ExpenseItem[] }>("/expenses", {
        params: { projectId, limit: 100 },
      });
      return data.data;
    },
    enabled: !!projectId,
  });
}