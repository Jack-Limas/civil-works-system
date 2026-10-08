"use client";

import { useId } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useFormatter, useTranslations } from "next-intl";
import { PackagePlus } from "lucide-react";
import { Field, fieldClass } from "@/components/ui/form";
import { MaterialPicker } from "./material-picker";
import { useFormatCOP } from "@/lib/format";
import type { InventoryMaterial } from "@/types/inventory";

export interface InventoryEntryState {
  enabled: boolean;
  material: InventoryMaterial | null;
  quantity: string;
}

export const emptyInventoryEntry: InventoryEntryState = { enabled: false, material: null, quantity: "" };

/** Parsed quantity, or null when it is not a positive number. */
export function entryQuantity(entry: InventoryEntryState): number | null {
  const n = Number(entry.quantity.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Optional "also record in inventory" block for MATERIALS expenses. The API
 * creates the expense and the IN movement in one transaction.
 */
export function ExpenseInventoryEntry({
  value,
  onChange,
  amount,
  showCost,
  showErrors,
}: {
  value: InventoryEntryState;
  onChange: (next: InventoryEntryState) => void;
  amount: number | undefined;
  showCost: boolean;
  showErrors: boolean;
}) {
  const t = useTranslations("inventory");
  const format = useFormatter();
  const formatCOP = useFormatCOP();
  const reduceMotion = useReducedMotion();
  const toggleId = useId();
  const quantity = entryQuantity(value);
  const unitCost = amount && quantity ? Math.round(amount / quantity) : null;

  return (
    <section className={`rounded-xl border bg-surface transition-colors ${value.enabled ? "border-success/50" : "border-line"}`}>
      <label htmlFor={toggleId} className="flex cursor-pointer items-center gap-3 p-4 sm:p-5">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
            value.enabled ? "bg-success/15 text-success" : "bg-surface-2 text-ink-muted"
          }`}
          aria-hidden
        >
          <PackagePlus size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">{t("expenseEntry.toggle")}</span>
          <span className="block text-xs text-ink-muted">{t("expenseEntry.hint")}</span>
        </span>
        <input
          id={toggleId}
          type="checkbox"
          role="switch"
          checked={value.enabled}
          onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${
            value.enabled ? "bg-success" : "bg-line"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform motion-reduce:transition-none ${
              value.enabled ? "translate-x-5.5" : "translate-x-0.5"
            }`}
          />
        </span>
      </label>

      <AnimatePresence initial={false}>
        {value.enabled && (
          <motion.div
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 gap-4 border-t border-line p-4 sm:grid-cols-[1fr_180px] sm:p-5">
              <div>
                <p className="mb-1 text-sm font-medium text-ink">{t("expenseEntry.material")}</p>
                <MaterialPicker
                  value={value.material}
                  onChange={(material) => onChange({ ...value, material })}
                  invalid={showErrors && !value.material}
                />
                {showErrors && !value.material && <p className="mt-1 text-xs text-critical">{t("movement.errors.material")}</p>}
              </div>
              <Field
                id={`${toggleId}-qty`}
                label={value.material ? t("movement.quantityIn", { unit: value.material.unit }) : t("expenseEntry.quantity")}
                error={showErrors && quantity === null ? t("movement.errors.quantity") : undefined}
              >
                <input
                  id={`${toggleId}-qty`}
                  inputMode="decimal"
                  value={value.quantity}
                  onChange={(e) => onChange({ ...value, quantity: e.target.value.replace(/[^\d.,]/g, "") })}
                  placeholder="0"
                  aria-invalid={showErrors && quantity === null}
                  className={`${fieldClass} font-mono-data`}
                />
              </Field>
              {showCost && unitCost !== null && value.material && (
                <p className="text-xs text-ink-muted sm:col-span-2">
                  {t("expenseEntry.unitCostAuto", { cost: `${formatCOP(unitCost)} / ${value.material.unit}` })}
                  {" · "}
                  {t("movement.afterOut", {
                    stock: format.number(value.material.stockAvailable + (quantity ?? 0), { maximumFractionDigits: 2 }),
                    unit: value.material.unit,
                  })}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
