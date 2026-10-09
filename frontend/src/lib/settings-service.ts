import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";

/** Mirrors backend/src/schemas/settings.schema.ts (keys, ranges and the cross rule). */
export interface SystemSettings {
  companyName: string;
  scheduleDelayThreshold: number;
  financialGapThreshold: number;
  consumptionWindowDays: number;
  criticalCoverageDays: number;
  warningCoverageDays: number;
  planningHorizonDays: number;
}
export type SettingKey = keyof SystemSettings;
export type NumericSettingKey = Exclude<SettingKey, "companyName">;

export const NUMERIC_SETTING_RULES: Record<NumericSettingKey, { min: number; max: number; unit: "points" | "days" }> = {
  scheduleDelayThreshold: { min: 1, max: 50, unit: "points" },
  financialGapThreshold: { min: 1, max: 50, unit: "points" },
  consumptionWindowDays: { min: 7, max: 90, unit: "days" },
  criticalCoverageDays: { min: 1, max: 60, unit: "days" },
  warningCoverageDays: { min: 2, max: 120, unit: "days" },
  planningHorizonDays: { min: 7, max: 180, unit: "days" },
};
export const COMPANY_NAME_MAX = 120;

export interface SettingsPayload {
  values: SystemSettings;
  defaults: SystemSettings;
  overridden: SettingKey[];
}

/** Everything that reads thresholds must refresh after a save. */
const DEPENDENT_KEYS = ["settings", "materials", "alerts", "reports", "dashboard", "projects", "predictions"];

export function useSettings() {
  return useQuery({
    queryKey: ["settings", "admin"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: SettingsPayload }>("/settings");
      return data.data;
    },
  });
}

/** Company name for printed headers; any signed-in user. */
export function usePublicSettings() {
  return useQuery({
    queryKey: ["settings", "public"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: { companyName: string } }>("/settings/public");
      return data.data;
    },
    staleTime: 5 * 60_000,
  });
}

function useInvalidateDependents() {
  const queryClient = useQueryClient();
  return () => DEPENDENT_KEYS.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
}

export function useUpdateSettings() {
  const invalidate = useInvalidateDependents();
  return useMutation({
    mutationFn: async (input: Partial<SystemSettings>) => {
      const { data } = await apiClient.put<{ data: SettingsPayload }>("/settings", input);
      return data.data;
    },
    onSuccess: invalidate,
  });
}

export function useResetSettings() {
  const invalidate = useInvalidateDependents();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<{ data: SettingsPayload }>("/settings/reset");
      return data.data;
    },
    onSuccess: invalidate,
  });
}
