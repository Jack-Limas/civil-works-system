import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";
import { createResourceHooks } from "./create-resource-hooks";
import { invalidateFinance } from "./expenses-service";
import {
  CashBalances,
  Cashflow,
  CreateFundTransferInput,
  FinanceSummary,
  FundTransfer,
  Supplier,
  SupplierStats,
} from "@/types/finance";

export function useFinanceSummary() {
  return useQuery({
    queryKey: ["finance", "summary"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: FinanceSummary }>("/finance/summary");
      return data.data;
    },
  });
}

export interface CashflowParams {
  months: number;
  projectId?: string;
  supplierId?: string;
  page?: number;
  limit?: number;
}

export function useCashflow(params: CashflowParams) {
  return useQuery({
    queryKey: ["finance", "cashflow", params],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Cashflow }>("/finance/cashflow", { params });
      return data.data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useCashBalances() {
  return useQuery({
    queryKey: ["cash", "balances"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: CashBalances }>("/cash/balances");
      return data.data;
    },
  });
}

// ---------- Suppliers ----------

export interface SupplierInput {
  name: string;
  nit?: string;
  category?: Supplier["category"];
  phone?: string;
  email?: string;
  notes?: string;
}

export const {
  useList: useSuppliers,
  useCreate: useCreateSupplier,
  useUpdate: useUpdateSupplier,
  useRemove: useRemoveSupplier,
} = createResourceHooks<Supplier, SupplierInput>("suppliers", "/suppliers");

export function useSupplierStats(enabled = true) {
  return useQuery({
    queryKey: ["suppliers", "stats"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: SupplierStats }>("/suppliers/stats");
      return data.data;
    },
    enabled,
  });
}

// ---------- Fund transfers ----------

export const { useList: useFundTransfers } = createResourceHooks<FundTransfer, CreateFundTransferInput>(
  "cash",
  "/fund-transfers"
);

/** Creating a transfer changes balances, cash flow and summaries. */
export function useCreateFundTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateFundTransferInput) => {
      const { data } = await apiClient.post<{ data: FundTransfer }>("/fund-transfers", input);
      return data.data;
    },
    onSuccess: () => invalidateFinance(queryClient),
  });
}
