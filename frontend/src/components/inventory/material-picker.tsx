"use client";

import { useEffect, useId, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Boxes, Plus, Search, X } from "lucide-react";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/form";
import { MaterialStatusBadge } from "./material-status";
import { useCreateMaterial, useMaterials } from "@/lib/materials-service";
import { useApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/store/toast.store";
import type { InventoryMaterial } from "@/types/inventory";

const SEARCH_DEBOUNCE_MS = 200;

/**
 * Searchable material combobox showing stock and status, with inline creation
 * (name + unit), which is all a resident may set for a new material.
 */
export function MaterialPicker({
  value,
  onChange,
  invalid,
  allowCreate = true,
}: {
  value: InventoryMaterial | null;
  onChange: (material: InventoryMaterial | null) => void;
  invalid?: boolean;
  allowCreate?: boolean;
}) {
  const t = useTranslations("inventory");
  const tCommon = useTranslations("common");
  const tForm = useTranslations("expenseForm");
  const format = useFormatter();
  const errorMessage = useApiErrorMessage();
  const listId = useId();

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [unit, setUnit] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isFetching } = useMaterials({ search: debounced || undefined, limit: 12, sort: "name" });
  const createMaterial = useCreateMaterial();
  const results = data?.data ?? [];
  const exact = results.some((m) => m.name.toLowerCase() === debounced.toLowerCase());
  const qty = (n: number) => format.number(n, { maximumFractionDigits: 2 });

  async function create() {
    try {
      const material = await createMaterial.mutateAsync({ name: query.trim(), unit: unit.trim() });
      toast.success(t("form.created"));
      // A new material has no stock and no movements yet, so it starts as OUT
      onChange({
        ...material,
        status: "OUT",
        dailyConsumption: 0,
        coverageDays: null,
        estimatedNeed: 0,
        suggestedPurchase: 0,
        lastMovement: null,
      });
      setCreating(false);
      setOpen(false);
      setQuery("");
      setUnit("");
    } catch (error) {
      toast.error(errorMessage(error, { 409: t("form.duplicate") }));
    }
  }

  if (value) {
    return (
      <div className="flex min-h-12 items-center justify-between gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Boxes size={16} className="shrink-0 text-accent" aria-hidden />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{value.name}</p>
            <p className="font-mono-data text-xs text-ink-muted">
              {qty(value.stockAvailable)} {value.unit}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-xs text-accent hover:bg-surface"
        >
          <X size={13} aria-hidden /> {tForm("change")}
        </button>
      </div>
    );
  }

  if (creating) {
    return (
      <div className="space-y-2 rounded-lg border border-accent/40 bg-surface-2 p-3">
        <p className="text-sm font-medium text-ink">{t("newMaterial")}</p>
        <input aria-label={t("fields.name")} value={query} onChange={(e) => setQuery(e.target.value)} className={fieldClass} />
        <input
          aria-label={t("fields.unit")}
          placeholder={t("form.unitPlaceholder")}
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className={fieldClass}
        />
        <div className="flex gap-2">
          <button type="button" onClick={() => setCreating(false)} className={`${secondaryButtonClass} flex-1`}>
            {tCommon("cancel")}
          </button>
          <button
            type="button"
            onClick={create}
            disabled={query.trim().length < 2 || !unit.trim() || createMaterial.isPending}
            className={`${primaryButtonClass} flex-1`}
          >
            {createMaterial.isPending ? tCommon("saving") : t("form.save")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search size={15} className="pointer-events-none absolute left-3 top-3.5 text-ink-muted sm:top-3" aria-hidden />
      <input
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid}
        aria-label={t("movement.materialPlaceholder")}
        placeholder={t("movement.materialPlaceholder")}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={`${fieldClass} pl-9 ${invalid ? "border-critical" : ""}`}
      />
      {open && (
        <ul id={listId} role="listbox" className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-line bg-surface py-1 shadow-xl">
          {isFetching && results.length === 0 && <li className="px-3 py-2 text-sm text-ink-muted">{tCommon("loading")}</li>}
          {results.map((m) => (
            <li key={m.id} role="option" aria-selected={false}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(m);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex min-h-12 w-full items-center justify-between gap-3 px-3 py-1.5 text-left hover:bg-surface-2"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-ink">{m.name}</span>
                  <span className="font-mono-data text-xs text-ink-muted">
                    {qty(m.stockAvailable)} {m.unit}
                  </span>
                </span>
                <MaterialStatusBadge status={m.status} />
              </button>
            </li>
          ))}
          {allowCreate && debounced.length >= 2 && !exact && (
            <li>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setCreating(true)}
                className="flex min-h-11 w-full items-center gap-2 border-t border-line px-3 text-left text-sm font-medium text-accent hover:bg-surface-2"
              >
                <Plus size={15} aria-hidden /> {t("resident.createInline")}: “{debounced}”
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
