"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Building, Info, Package, RotateCcw, ShieldAlert } from "lucide-react";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useMaterials } from "@/lib/materials-service";
import {
  COMPANY_NAME_MAX,
  NUMERIC_SETTING_RULES,
  useResetSettings,
  useUpdateSettings,
  type NumericSettingKey,
  type SettingKey,
  type SettingsPayload,
  type SystemSettings,
} from "@/lib/settings-service";
import { useApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/store/toast.store";

type Draft = Record<SettingKey, string>;
const GROUPS: Array<{ id: "general" | "risk" | "inventory"; icon: typeof Building; keys: SettingKey[] }> = [
  { id: "general", icon: Building, keys: ["companyName"] },
  { id: "risk", icon: ShieldAlert, keys: ["scheduleDelayThreshold", "financialGapThreshold"] },
  { id: "inventory", icon: Package, keys: ["consumptionWindowDays", "criticalCoverageDays", "warningCoverageDays", "planningHorizonDays"] },
];

function toDraft(values: SystemSettings): Draft {
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, String(v)])) as Draft;
}

/**
 * Settings editor. The draft lives in local state (the parent remounts it with
 * a new key after every save), validation mirrors the API (ranges, integers and
 * critical < warning) and only changed keys are sent.
 */
export function SettingsForm({ payload }: { payload: SettingsPayload }) {
  const t = useTranslations("settings");
  const errorMessage = useApiErrorMessage();
  const reduceMotion = useReducedMotion();
  const save = useUpdateSettings();
  const reset = useResetSettings();
  const { data: materials } = useMaterials({ limit: 200 });
  const [draft, setDraft] = useState<Draft>(() => toDraft(payload.values));
  const [confirmReset, setConfirmReset] = useState(false);

  const initial = useMemo(() => toDraft(payload.values), [payload.values]);
  const changed = (Object.keys(draft) as SettingKey[]).filter((k) => draft[k].trim() !== initial[k]);
  const dirty = changed.length > 0;

  const errors = useMemo(() => {
    const result: Partial<Record<SettingKey, string>> = {};
    if (draft.companyName.trim().length > COMPANY_NAME_MAX) result.companyName = t("errors.tooLong", { max: COMPANY_NAME_MAX });
    for (const key of Object.keys(NUMERIC_SETTING_RULES) as NumericSettingKey[]) {
      const { min, max } = NUMERIC_SETTING_RULES[key];
      const raw = draft[key].trim();
      const value = Number(raw);
      if (raw === "" || !Number.isFinite(value)) result[key] = t("errors.range", { min, max });
      else if (!Number.isInteger(value)) result[key] = t("errors.integer");
      else if (value < min || value > max) result[key] = t("errors.range", { min, max });
    }
    if (!result.criticalCoverageDays && !result.warningCoverageDays && Number(draft.criticalCoverageDays) >= Number(draft.warningCoverageDays)) {
      result.criticalCoverageDays = t("errors.criticalBelowWarning");
    }
    return result;
  }, [draft, t]);
  const valid = Object.keys(errors).length === 0;

  // Live preview of the coverage thresholds on today's materials (same rules as the API).
  // Only meaningful while the consumption window is unchanged (coverage depends on it).
  const preview = useMemo(() => {
    if (!materials || errors.criticalCoverageDays || errors.warningCoverageDays) return null;
    if (draft.consumptionWindowDays.trim() !== initial.consumptionWindowDays) return null;
    const critical = Number(draft.criticalCoverageDays);
    const warning = Number(draft.warningCoverageDays);
    let criticalCount = 0;
    let warningCount = 0;
    for (const m of materials.data) {
      if (m.stockAvailable <= 0) continue;
      if (m.stockAvailable < m.stockMinimum || (m.coverageDays !== null && m.coverageDays < critical)) criticalCount++;
      else if (m.coverageDays !== null && m.coverageDays < warning) warningCount++;
    }
    return { critical: criticalCount, warning: warningCount };
  }, [materials, draft, initial, errors]);

  // Warn before leaving with unsaved changes (event listener, not state)
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  async function handleSave() {
    if (!valid || !dirty) return;
    const input: Partial<SystemSettings> = {};
    for (const key of changed) {
      if (key === "companyName") input.companyName = draft.companyName.trim();
      else input[key] = Number(draft[key]);
    }
    try {
      await save.mutateAsync(input);
      toast.success(t("saved"));
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function handleReset() {
    try {
      await reset.mutateAsync();
      toast.success(t("resetDone"));
      setConfirmReset(false);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  const field = (key: SettingKey): ReactNode => {
    const id = `setting-${key}`;
    const error = errors[key];
    const customized = payload.overridden.includes(key);
    const defaultValue = String(payload.defaults[key]);
    const isText = key === "companyName";
    const rule = isText ? null : NUMERIC_SETTING_RULES[key as NumericSettingKey];
    const isDirty = changed.includes(key);
    return (
      <div key={key} className="grid grid-cols-1 gap-2 py-4 sm:grid-cols-[1fr_220px] sm:items-start sm:gap-6">
        <div>
          <label htmlFor={id} className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
            {t(`fields.${key}.label`)}
            {customized && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent">{t("customized")}</span>}
            {isDirty && <span className="h-2 w-2 rounded-full bg-warning" aria-hidden />}
          </label>
          <p id={`${id}-hint`} className="mt-0.5 text-xs text-ink-muted">
            {t(`fields.${key}.hint`)}
          </p>
        </div>
        <div>
          <div className="relative">
            <input
              id={id}
              type={isText ? "text" : "number"}
              inputMode={isText ? "text" : "numeric"}
              min={rule?.min}
              max={rule?.max}
              step={1}
              value={draft[key]}
              onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
              placeholder={isText ? t("fields.companyName.placeholder") : undefined}
              maxLength={isText ? COMPANY_NAME_MAX + 10 : undefined}
              aria-invalid={!!error}
              aria-describedby={`${id}-hint ${id}-meta`}
              className={`${fieldClass} ${rule ? "pr-14 text-right font-mono-data" : ""} ${error ? "border-critical" : ""}`}
            />
            {rule && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">{t(`units.${rule.unit}`)}</span>}
          </div>
          <p id={`${id}-meta`} className={`mt-1 text-xs ${error ? "text-critical" : "text-ink-muted"}`} role={error ? "alert" : undefined}>
            {error ??
              (rule
                ? `${t("range", { min: rule.min, max: rule.max })} · ${t("default", { value: defaultValue })}`
                : defaultValue
                  ? t("default", { value: defaultValue })
                  : null)}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 pb-24">
      <p className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-xs text-ink-muted">
        <Info size={14} className="shrink-0" aria-hidden /> {t("fixedNote")}
      </p>

      {GROUPS.map(({ id, icon: Icon, keys }) => (
        <section key={id} className="rounded-xl border border-line bg-surface px-5 pt-5">
          <div className="flex items-start gap-3 pb-1">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent" aria-hidden>
              <Icon size={18} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-ink">{t(`groups.${id}.title`)}</h2>
              <p className="text-xs text-ink-muted">{t(`groups.${id}.description`)}</p>
            </div>
          </div>
          <div className="divide-y divide-line">{keys.map(field)}</div>
          {id === "inventory" && preview && (
            <p className="mb-5 rounded-lg bg-ai/10 px-3 py-2 text-xs text-ink" aria-live="polite">
              {t("preview", preview)}
            </p>
          )}
        </section>
      ))}

      <div className="flex justify-end">
        <button type="button" onClick={() => setConfirmReset(true)} disabled={payload.overridden.length === 0 || reset.isPending} className={secondaryButtonClass}>
          <RotateCcw size={15} aria-hidden /> {t("reset")}
        </button>
      </div>

      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={reduceMotion ? false : { y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { y: 80, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.12)] backdrop-blur lg:left-64"
            role="region"
            aria-label={t("unsaved")}
          >
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm font-medium text-ink">
                <span className="h-2 w-2 rounded-full bg-warning" aria-hidden /> {t("unsaved")}
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setDraft(initial)} disabled={save.isPending} className={secondaryButtonClass}>
                  {t("discard")}
                </button>
                <button type="button" onClick={handleSave} disabled={!valid || save.isPending} className={primaryButtonClass}>
                  {save.isPending ? t("saving") : t("save")}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmReset}
        title={t("resetTitle")}
        confirmLabel={t("resetConfirm")}
        cancelLabel={t("cancel")}
        tone="critical"
        busy={reset.isPending}
        onConfirm={handleReset}
        onClose={() => setConfirmReset(false)}
      >
        <p>{t("resetBody")}</p>
      </ConfirmDialog>
    </div>
  );
}
