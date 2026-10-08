"use client";

import { useTranslations } from "next-intl";
import { Fuel, HardHat, LucideIcon, MoreHorizontal, Package, Truck, Wrench } from "lucide-react";
import { EXPENSE_CATEGORIES, ExpenseCategory } from "@/types/finance";

const ICONS: Record<ExpenseCategory, LucideIcon> = {
  MATERIALS: Package,
  LABOR: HardHat,
  EQUIPMENT: Wrench,
  TRANSPORT: Truck,
  FUEL: Fuel,
  OTHER: MoreHorizontal,
};

/** Large tappable cards (radio group semantics) for the six expense categories. */
export function CategoryPicker({
  value,
  onChange,
  labelledBy,
}: {
  value: ExpenseCategory;
  onChange: (category: ExpenseCategory) => void;
  labelledBy: string;
}) {
  const t = useTranslations("expenses.categories");

  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="grid grid-cols-3 gap-2">
      {EXPENSE_CATEGORIES.map((category) => {
        const Icon = ICONS[category];
        const selected = value === category;
        return (
          <button
            key={category}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(category)}
            className={`flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-xl border px-1 py-2 text-center text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              selected
                ? "border-accent bg-accent/10 text-accent"
                : "border-line bg-surface-2 text-ink-muted hover:border-accent/50 hover:text-ink"
            }`}
          >
            <Icon size={20} aria-hidden />
            {t(category)}
          </button>
        );
      })}
    </div>
  );
}
