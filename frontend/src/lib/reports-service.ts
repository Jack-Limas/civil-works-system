import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";
import type {
  CompiledDay,
  FieldReport,
  FieldReportDetail,
  FieldReportFilters,
  FieldReportInput,
  FieldReportList,
  ReportByType,
  ReportParams,
  ReportSummary,
  ReportType,
} from "@/types/reports";

export function useReport<T extends ReportType>(type: T, params: ReportParams, enabled = true) {
  return useQuery({
    queryKey: ["reports", type, params],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: ReportByType[T] }>(`/reports/${type}`, { params });
      return data.data;
    },
    placeholderData: keepPreviousData,
    enabled,
    // Reports are computed on demand; keep them fresh for a minute
    staleTime: 60_000,
  });
}

export function useReportSummary() {
  return useMutation({
    mutationFn: async (input: ReportParams & { type: ReportType; locale: string }) => {
      const { data } = await apiClient.post<{ data: ReportSummary }>("/reports/summary", input);
      return data.data;
    },
  });
}

// ---------- Daily site log ----------

function invalidateFieldReports(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["field-reports"] });
}

export function useFieldReports(filters: FieldReportFilters, enabled = true) {
  return useQuery({
    queryKey: ["field-reports", "list", filters],
    queryFn: async () => {
      const { data } = await apiClient.get<FieldReportList>("/field-reports", { params: filters });
      return data;
    },
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useFieldReport(id: string | null) {
  return useQuery({
    queryKey: ["field-reports", "detail", id],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: FieldReportDetail }>(`/field-reports/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCompiledDay(projectId: string, date?: string) {
  return useQuery({
    queryKey: ["field-reports", "compile", projectId, date],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: CompiledDay }>("/field-reports/compile", { params: { projectId, date } });
      return data.data;
    },
    enabled: !!projectId,
  });
}

export function useCreateFieldReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: FieldReportInput) => {
      const { data } = await apiClient.post<{ data: FieldReport }>("/field-reports", input);
      return data.data;
    },
    onSuccess: () => invalidateFieldReports(queryClient),
  });
}

export function useUpdateFieldReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Omit<FieldReportInput, "projectId" | "date"> }) => {
      const { data } = await apiClient.patch<{ data: FieldReport }>(`/field-reports/${id}`, input);
      return data.data;
    },
    onSuccess: () => invalidateFieldReports(queryClient),
  });
}

export function useReviewFieldReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const { data } = await apiClient.patch<{ data: FieldReport }>(`/field-reports/${id}/review`, { note });
      return data.data;
    },
    onSuccess: () => invalidateFieldReports(queryClient),
  });
}
