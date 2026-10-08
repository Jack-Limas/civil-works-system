import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";
import { ExpenseFilters, ExpenseRecord, Paginated } from "@/types/finance";

export { EXPENSE_CATEGORIES } from "@/types/finance";
export type { ExpenseCategory, ExpenseRecord as Expense } from "@/types/finance";

export interface BudgetIndicators {
  budget: number;
  executedExpenses: number;
  availableBudget: number;
  executedPercentage: number;
  physicalProgress: number;
  financialVsPhysicalGap: number;
}

/** Every cached view that depends on expenses (lists, summaries, balances, alerts, linked stock). */
export function invalidateFinance(queryClient: ReturnType<typeof useQueryClient>) {
  for (const key of ["expenses", "finance", "cash", "suppliers", "alerts", "dashboard", "materials"]) {
    queryClient.invalidateQueries({ queryKey: [key] });
  }
}

export function useExpensesList(filters: ExpenseFilters, enabled = true) {
  return useQuery({
    queryKey: ["expenses", "list", filters],
    queryFn: async () => {
      const { data } = await apiClient.get<Paginated<ExpenseRecord>>("/expenses", { params: filters });
      return data;
    },
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** APPROVED expenses of one project: the only ones that count as executed spend. */
export function useProjectExpenses(projectId: string) {
  return useQuery({
    queryKey: ["expenses", "project", projectId],
    queryFn: async () => {
      const { data } = await apiClient.get<Paginated<ExpenseRecord>>("/expenses", {
        params: { projectId, status: "APPROVED", limit: 100 },
      });
      return data.data;
    },
    enabled: !!projectId,
  });
}

/**
 * Creates an expense. A FormData payload (with an optional "support" file)
 * is sent as multipart; plain objects as JSON.
 */
export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: FormData | Record<string, unknown>) => {
      const { data } = await apiClient.post<{ data: ExpenseRecord }>("/expenses", payload, {
        headers: payload instanceof FormData ? { "Content-Type": "multipart/form-data" } : undefined,
      });
      return data.data;
    },
    onSuccess: () => invalidateFinance(queryClient),
  });
}

export function useReviewExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; decision: "APPROVE" | "REJECT"; reason?: string }) => {
      const { data } = await apiClient.patch<{ data: ExpenseRecord }>(`/expenses/${input.id}/review`, {
        decision: input.decision,
        reason: input.reason,
      });
      return data.data;
    },
    onSuccess: () => invalidateFinance(queryClient),
  });
}

export function useBudgetIndicators(projectId: string) {
  return useQuery({
    queryKey: ["expenses", "indicators", projectId],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: BudgetIndicators }>(`/expenses/project/${projectId}/indicators`);
      return data.data;
    },
    enabled: !!projectId,
  });
}
