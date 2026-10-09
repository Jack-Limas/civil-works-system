import { z } from "zod";
import { RISK_THRESHOLDS } from "../config/risk-thresholds";
import { INVENTORY_THRESHOLDS } from "../config/inventory-thresholds";

/**
 * Every configurable setting with its code default (the values the system
 * always used, so nothing changes until an admin edits something). Currency
 * (COP) and the business timezone (America/Bogota) are intentionally absent.
 */
export const SETTING_DEFAULTS = {
  /** Shown on printed reports; empty = logo only. */
  companyName: "",
  /** Percentage points behind schedule tolerated before a delay alert (x2 = high). */
  scheduleDelayThreshold: RISK_THRESHOLDS.SCHEDULE_DELAY,
  /** Percentage points of spend ahead of physical progress tolerated (x2 = high). */
  financialGapThreshold: RISK_THRESHOLDS.FINANCIAL_GAP,
  consumptionWindowDays: INVENTORY_THRESHOLDS.CONSUMPTION_WINDOW_DAYS,
  criticalCoverageDays: INVENTORY_THRESHOLDS.CRITICAL_COVERAGE_DAYS,
  warningCoverageDays: INVENTORY_THRESHOLDS.WARNING_COVERAGE_DAYS,
  planningHorizonDays: INVENTORY_THRESHOLDS.PLANNING_HORIZON_DAYS,
};
export type Settings = { [K in keyof typeof SETTING_DEFAULTS]: (typeof SETTING_DEFAULTS)[K] extends string ? string : number };
export type SettingKey = keyof Settings;
export const SETTING_KEYS = Object.keys(SETTING_DEFAULTS) as SettingKey[];

const int = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

/** Per-key rules; also used to validate stored rows when they are read back. */
export const settingValueSchemas: { [K in SettingKey]: z.ZodType<Settings[K]> } = {
  companyName: z.string().trim().max(120),
  scheduleDelayThreshold: int(1, 50),
  financialGapThreshold: int(1, 50),
  consumptionWindowDays: int(7, 90),
  criticalCoverageDays: int(1, 60),
  warningCoverageDays: int(2, 120),
  planningHorizonDays: int(7, 180),
};

/** Rules that involve more than one setting, checked on the merged result. */
export function crossCheck(settings: Settings): Array<{ path: SettingKey; message: string }> {
  const issues: Array<{ path: SettingKey; message: string }> = [];
  if (settings.criticalCoverageDays >= settings.warningCoverageDays) {
    issues.push({ path: "criticalCoverageDays", message: "Critical coverage must be lower than warning coverage" });
  }
  return issues;
}

/** PUT body: any subset of keys, unknown keys rejected. */
export const updateSettingsSchema = z.object(settingValueSchemas).partial().strict();
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
