"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Field, fieldClass, primaryButtonClass } from "@/components/ui/form";
import { useCreateMaterial, useUpdateMaterial } from "@/lib/materials-service";
import { useApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/store/toast.store";
import { MATERIAL_CATEGORIES, type InventoryMaterial } from "@/types/inventory";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  unit: z.string().trim().min(1).max(30),
  category: z.enum(MATERIAL_CATEGORIES).or(z.literal("")),
  stockMinimum: z.coerce.number().min(0),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

/**
 * Admins create and edit the full descriptive record; residents can only create
 * with name and unit. Stock is never edited here: it only moves via movements.
 */
export function MaterialFormModal({
  open,
  onClose,
  material,
  isAdmin,
}: {
  open: boolean;
  onClose: () => void;
  material: InventoryMaterial | null;
  isAdmin: boolean;
}) {
  const t = useTranslations("inventory");
  const tCommon = useTranslations("common");
  const errorMessage = useApiErrorMessage();
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", unit: "", category: "", stockMinimum: 0 },
  });

  useEffect(() => {
    if (!open) return;
    reset(
      material
        ? { name: material.name, unit: material.unit, category: material.category ?? "", stockMinimum: material.stockMinimum }
        : { name: "", unit: "", category: "", stockMinimum: 0 }
    );
  }, [open, material, reset]);

  async function onSubmit(values: FormValues) {
    try {
      if (material) {
        await updateMaterial.mutateAsync({
          id: material.id,
          input: { name: values.name, unit: values.unit, stockMinimum: values.stockMinimum, category: values.category || null },
        });
        toast.success(t("form.updated"));
      } else {
        await createMaterial.mutateAsync({
          name: values.name,
          unit: values.unit,
          ...(isAdmin && { stockMinimum: values.stockMinimum, category: values.category || undefined }),
        });
        toast.success(t("form.created"));
      }
      onClose();
    } catch (error) {
      toast.error(errorMessage(error, { 409: t("form.duplicate") }));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={material ? t("editMaterial") : t("newMaterial")}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
        <Field id="material-name" label={t("fields.name")} error={errors.name && t("form.nameError")}>
          <input id="material-name" {...register("name")} placeholder={t("form.namePlaceholder")} className={fieldClass} />
        </Field>
        <Field id="material-unit" label={t("fields.unit")} error={errors.unit && t("form.unitError")}>
          <input id="material-unit" {...register("unit")} placeholder={t("form.unitPlaceholder")} className={fieldClass} />
        </Field>
        {isAdmin ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field id="material-category" label={t("fields.category")}>
              <select id="material-category" {...register("category")} className={fieldClass}>
                <option value="">{t("list.noCategory")}</option>
                {MATERIAL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`categories.${c}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="material-minimum" label={t("fields.minimum")} error={errors.stockMinimum && t("form.minError")}>
              <input
                id="material-minimum"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                {...register("stockMinimum")}
                className={`${fieldClass} font-mono-data`}
              />
            </Field>
          </div>
        ) : (
          <p className="flex items-start gap-2 rounded-lg bg-surface-2 p-3 text-xs text-ink-muted">
            <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
            {t("form.residentNote")}
          </p>
        )}
        <button type="submit" disabled={isSubmitting} className={`${primaryButtonClass} w-full`}>
          {isSubmitting ? tCommon("saving") : t("form.save")}
        </button>
      </form>
    </Modal>
  );
}
