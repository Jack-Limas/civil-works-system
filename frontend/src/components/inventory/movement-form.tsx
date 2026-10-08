"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ArrowDownToLine, ArrowUpFromLine, AlertTriangle } from "lucide-react";
import { Field, fieldClass, primaryButtonClass } from "@/components/ui/form";
import { ProjectSelect } from "@/components/projects/project-select";
import { SupplierPicker } from "@/components/finance/supplier-picker";
import { MoneyInput } from "@/components/finance/money-input";
import { MaterialPicker } from "./material-picker";
import { useRegisterMovement } from "@/lib/materials-service";
import { useExpensesList } from "@/lib/expenses-service";
import { useProjects } from "@/lib/projects-service";
import { useFormatCOP } from "@/lib/format";
import { useApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/store/toast.store";
import type { InventoryMaterial, MovementResult, MovementType } from "@/types/inventory";

interface Props {
  /** "admin": IN/OUT with costs and links. "resident": consumption (OUT) only, no costs. */
  mode: "admin" | "resident";
  defaultType?: MovementType;
  defaultMaterial?: InventoryMaterial | null;
  onDone?: (result: MovementResult) => void;
}

/**
 * Movement registration shared by the admin ledger and the resident's quick
 * "record consumption" sheet. Validation messages are translated; the server
 * enforces the same rules (ownership, stock never negative).
 */
export function MovementForm({ mode, defaultType = "OUT", defaultMaterial = null, onDone }: Props) {
  const t = useTranslations("inventory.movement");
  const tCategories = useTranslations("expenses.categories");
  const format = useFormatter();
  const formatCOP = useFormatCOP();
  const errorMessage = useApiErrorMessage();
  const register = useRegisterMovement();
  const isAdmin = mode === "admin";

  const [type, setType] = useState<MovementType>(isAdmin ? defaultType : "OUT");
  const [material, setMaterial] = useState<InventoryMaterial | null>(defaultMaterial);
  const [quantity, setQuantity] = useState("");
  const [projectId, setProjectId] = useState("");
  const [supplier, setSupplier] = useState<{ id: string; name: string } | null>(null);
  const [unitCost, setUnitCost] = useState<number | undefined>(undefined);
  const [expenseId, setExpenseId] = useState("");
  const [notes, setNotes] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  // Residents with a single project get it preselected (derived, no effect needed)
  const { data: projects } = useProjects({ limit: 100 });
  const onlyProject = !isAdmin && projects?.data.length === 1 ? projects.data[0].id : "";
  const effectiveProjectId = projectId || onlyProject;

  const { data: materialExpenses } = useExpensesList({ category: "MATERIALS", limit: 50 }, isAdmin && type === "IN");
  const linkable = (materialExpenses?.data ?? []).filter((e) => e.status !== "REJECTED");

  const qty = Number(quantity.replace(",", "."));
  const qtyValid = Number.isFinite(qty) && qty > 0;
  const remaining = material && type === "OUT" && qtyValid ? material.stockAvailable - qty : null;
  const insufficient = remaining !== null && remaining < 0;
  const projectRequired = !isAdmin;

  const errors = {
    material: !material,
    quantity: !qtyValid,
    project: projectRequired && !effectiveProjectId,
  };
  const hasErrors = Object.values(errors).some(Boolean) || insufficient;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setShowErrors(true);
    if (hasErrors || !material) return;
    try {
      const result = await register.mutateAsync({
        materialId: material.id,
        type,
        quantity: qty,
        projectId: effectiveProjectId || undefined,
        ...(isAdmin && {
          supplierId: type === "IN" ? supplier?.id : undefined,
          unitCost: type === "IN" ? unitCost : undefined,
          expenseId: type === "IN" && expenseId ? expenseId : undefined,
        }),
        notes: notes.trim() || undefined,
      });
      toast.success(t("registered"));
      if (result.belowMinimum) {
        toast.info(
          t("belowMinimum", {
            name: result.material.name,
            stock: format.number(result.material.stockAvailable, { maximumFractionDigits: 2 }),
            unit: result.material.unit,
          })
        );
      }
      setQuantity("");
      setNotes("");
      setUnitCost(undefined);
      setExpenseId("");
      setShowErrors(false);
      setMaterial(isAdmin ? null : result.material);
      onDone?.(result);
    } catch (error) {
      toast.error(errorMessage(error, { 400: t("insufficient") }));
    }
  }

  const n = (v: number) => format.number(v, { maximumFractionDigits: 2 });

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {isAdmin && (
        <div>
          <p className="mb-1 text-sm font-medium text-ink">{t("type")}</p>
          <div role="radiogroup" className="grid grid-cols-2 gap-2">
            {(["IN", "OUT"] as const).map((value) => {
              const selected = type === value;
              const Icon = value === "IN" ? ArrowDownToLine : ArrowUpFromLine;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setType(value)}
                  className={`flex min-h-16 items-center gap-3 rounded-xl border px-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                    selected
                      ? value === "IN"
                        ? "border-success bg-success/10 text-success"
                        : "border-accent bg-accent/10 text-accent"
                      : "border-line bg-surface-2 text-ink-muted hover:text-ink"
                  }`}
                >
                  <Icon size={20} aria-hidden />
                  <span>
                    <span className="block text-sm font-semibold">{value === "IN" ? t("in") : t("out")}</span>
                    <span className="block text-xs opacity-80">{value === "IN" ? t("inHint") : t("outHint")}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <p className="mb-1 text-sm font-medium text-ink">{t("material")}</p>
        <MaterialPicker value={material} onChange={setMaterial} invalid={showErrors && errors.material} />
        {showErrors && errors.material && <p className="mt-1 text-xs text-critical">{t("errors.material")}</p>}
      </div>

      <Field
        id="movement-quantity"
        label={material ? t("quantityIn", { unit: material.unit }) : t("quantity")}
        error={showErrors && errors.quantity ? t("errors.quantity") : undefined}
        hint={
          material ? (
            <span className={insufficient ? "text-critical" : ""}>
              {insufficient
                ? t("insufficient")
                : remaining !== null
                  ? t("afterOut", { stock: n(remaining), unit: material.unit })
                  : t("available", { stock: n(material.stockAvailable), unit: material.unit })}
            </span>
          ) : undefined
        }
      >
        <input
          id="movement-quantity"
          inputMode="decimal"
          autoComplete="off"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value.replace(/[^\d.,]/g, ""))}
          placeholder="0"
          className={`${fieldClass} font-mono-data text-lg ${insufficient ? "border-critical" : ""}`}
        />
      </Field>

      <Field
        id="movement-project"
        label={projectRequired ? t("project") : t("projectOptional")}
        error={showErrors && errors.project ? t("errors.project") : undefined}
      >
        <ProjectSelect
          id="movement-project"
          allowNone={!projectRequired}
          value={effectiveProjectId}
          onChange={(e) => setProjectId(e.target.value)}
        />
      </Field>

      {isAdmin && type === "IN" && (
        <>
          <div>
            <p className="mb-1 text-sm font-medium text-ink">{t("supplier")}</p>
            <SupplierPicker value={supplier} onChange={setSupplier} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field id="movement-cost" label={t("unitCost")}>
              <MoneyInput id="movement-cost" value={unitCost} onValueChange={setUnitCost} />
            </Field>
            <Field id="movement-expense" label={t("expense")}>
              <select id="movement-expense" value={expenseId} onChange={(e) => setExpenseId(e.target.value)} className={fieldClass}>
                <option value="">{t("expensePlaceholder")}</option>
                {linkable.map((e) => (
                  <option key={e.id} value={e.id}>
                    {(e.description || tCategories(e.category)).slice(0, 40)} · {formatCOP(e.amount)} · {e.project.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </>
      )}

      <Field id="movement-notes" label={t("notes")}>
        <textarea
          id="movement-notes"
          rows={2}
          maxLength={500}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("notesPlaceholder")}
          className={fieldClass}
        />
      </Field>

      {showErrors && insufficient && (
        <p role="alert" className="flex items-center gap-2 rounded-lg border border-critical/30 bg-critical/10 p-3 text-sm text-critical">
          <AlertTriangle size={16} aria-hidden /> {t("insufficient")}
        </p>
      )}

      <button type="submit" disabled={register.isPending} className={`${primaryButtonClass} min-h-12 w-full`}>
        {register.isPending ? t("saving") : isAdmin ? t("submit") : t("submitConsumption")}
      </button>
    </form>
  );
}
