"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Search, Store, X } from "lucide-react";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/form";
import { useCreateSupplier, useSuppliers } from "@/lib/finance-service";
import { useApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/store/toast.store";
import { Supplier } from "@/types/finance";

const SEARCH_DEBOUNCE_MS = 250;

/**
 * Searchable supplier combobox with inline creation (name + optional NIT),
 * which is everything a resident is allowed to set for a new supplier.
 */
export function SupplierPicker({
  value,
  onChange,
}: {
  value: Pick<Supplier, "id" | "name"> | null;
  onChange: (supplier: Pick<Supplier, "id" | "name"> | null) => void;
}) {
  const t = useTranslations("expenseForm");
  const tSuppliers = useTranslations("suppliers");
  const tCommon = useTranslations("common");
  const errorMessage = useApiErrorMessage();
  const listId = useId();

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [nit, setNit] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isFetching } = useSuppliers({ search: debounced || undefined, limit: 8 });
  const createSupplier = useCreateSupplier();
  const results = data?.data ?? [];
  const exactMatch = results.some((s) => s.name.toLowerCase() === debounced.toLowerCase());

  async function create() {
    try {
      const supplier = await createSupplier.mutateAsync({ name: query.trim(), nit: nit.trim() || undefined });
      onChange({ id: supplier.id, name: supplier.name });
      toast.success(t("supplierCreated"));
      setCreating(false);
      setOpen(false);
      setQuery("");
      setNit("");
    } catch (error) {
      toast.error(errorMessage(error, { 409: tSuppliers("duplicateNit") }));
    }
  }

  if (value) {
    return (
      <div className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2">
        <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
          <Store size={15} className="shrink-0 text-accent" aria-hidden />
          <span className="truncate">{value.name}</span>
        </span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-xs text-accent hover:bg-surface"
        >
          <X size={13} aria-hidden /> {t("change")}
        </button>
      </div>
    );
  }

  if (creating) {
    return (
      <div className="space-y-2 rounded-lg border border-accent/40 bg-surface-2 p-3">
        <p className="text-sm font-medium text-ink">{t("supplierNewTitle")}</p>
        <input
          aria-label={tSuppliers("fields.name")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={fieldClass}
        />
        <input
          aria-label={t("supplierNit")}
          placeholder={t("supplierNit")}
          value={nit}
          onChange={(e) => setNit(e.target.value)}
          inputMode="numeric"
          className={fieldClass}
        />
        <div className="flex gap-2">
          <button type="button" onClick={() => setCreating(false)} className={`${secondaryButtonClass} flex-1`}>
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={create}
            disabled={query.trim().length < 2 || createSupplier.isPending}
            className={`${primaryButtonClass} flex-1`}
          >
            {createSupplier.isPending ? tCommon("saving") : tSuppliers("save")}
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
        aria-label={t("supplierSearch")}
        placeholder={t("supplierSearch")}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={`${fieldClass} pl-9`}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-line bg-surface py-1 shadow-lg"
        >
          {isFetching && results.length === 0 && <li className="px-3 py-2 text-sm text-ink-muted">{tCommon("loading")}</li>}
          {results.map((s) => (
            <li key={s.id} role="option" aria-selected={false}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange({ id: s.id, name: s.name });
                  setOpen(false);
                  setQuery("");
                }}
                className="flex min-h-11 w-full flex-col items-start justify-center px-3 py-1.5 text-left hover:bg-surface-2"
              >
                <span className="text-sm text-ink">{s.name}</span>
                {s.nit && <span className="font-mono-data text-xs text-ink-muted">{s.nit}</span>}
              </button>
            </li>
          ))}
          {debounced.length >= 2 && !exactMatch && (
            <li>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setCreating(true)}
                className="flex min-h-11 w-full items-center gap-2 border-t border-line px-3 text-left text-sm font-medium text-accent hover:bg-surface-2"
              >
                <Plus size={15} aria-hidden /> {t("supplierNew", { name: debounced })}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
