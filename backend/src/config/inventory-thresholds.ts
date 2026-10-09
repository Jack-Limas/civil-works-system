/**
 * Default rule-based inventory analysis thresholds (explainable, no AI).
 * The effective values come from system settings (settings.service); an admin
 * can customise them and reset back to these.
 *
 * Coverage (days) = stockAvailable / average daily consumption over the
 * consumption window. Status rules, evaluated in order:
 *   OUT       stock is 0
 *   CRITICAL  stock below its minimum OR coverage < CRITICAL_COVERAGE_DAYS
 *   WARNING   coverage < WARNING_COVERAGE_DAYS
 *   OK        otherwise (including materials with no recent consumption)
 */
export const INVENTORY_THRESHOLDS = {
  /** Days of OUT movements used to estimate the average daily consumption. */
  CONSUMPTION_WINDOW_DAYS: 30,
  CRITICAL_COVERAGE_DAYS: 7,
  WARNING_COVERAGE_DAYS: 14,
  /** Horizon for "estimated need" and the suggested purchase quantity. */
  PLANNING_HORIZON_DAYS: 30,
} as const;
