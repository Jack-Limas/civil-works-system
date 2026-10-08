"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/modal";
import { Field, fieldClass, primaryButtonClass } from "@/components/ui/form";
import { useCreateSupplier, useUpdateSupplier } from "@/lib/finance-service";
import { useApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/store/toast.store";
import { EXPENSE_CATEGORIES, Supplier } from "@/types/finance";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  nit: z.string().trim().max(30),
  category: z.enum(EXPENSE_CATEGORIES).or(z.literal("")),
  phone: z.string().trim().max(30),
  email: z.string().trim().email().or(z.literal("")),
  notes: z.string().trim().max(500),
});

type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = { name: "", nit: "", category: "", phone: "", email: "", notes: "" };

/**
 * Create or edit a supplier. Residents only get name and NIT (the API ignores
 * anything else they send); admins maintain the full record.
 */
export function SupplierFormModal({
  open,
  onClose,
  supplier,
  fullForm,
}: {
  open: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  fullForm: boolean;
}) {
  const t = useTranslations("suppliers");
  const tCategories = useTranslations("expenses.categories");
  const tCommon = useTranslations("common");
  const errorMessage = useApiErrorMessage();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  useEffect(() => {
    if (!open) return;
    reset(
      supplier
        ? {
            name: supplier.name,
            nit: supplier.nit ?? "",
            category: supplier.category ?? "",
            phone: supplier.phone ?? "",
            email: supplier.email ?? "",
            notes: supplier.notes ?? "",
          }
        : EMPTY
    );
  }, [open, supplier, reset]);

  async function onSubmit(values: FormValues) {
    const input = {
      name: values.name,
      nit: values.nit || undefined,
      ...(fullForm && {
        category: values.category || undefined,
        phone: values.phone || undefined,
        email: values.email || undefined,
        notes: values.notes || undefined,
      }),
    };
    try {
      if (supplier) {
        await updateSupplier.mutateAsync({ id: supplier.id, input });
        toast.success(t("updated"));
      } else {
        await createSupplier.mutateAsync(input);
        toast.success(t("created"));
      }
      onClose();
    } catch (error) {
      toast.error(errorMessage(error, { 409: t("duplicateNit") }));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={supplier ? t("edit") : t("new")}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
        <Field id="supplier-name" label={t("fields.name")} error={errors.name && t("nameError")}>
          <input id="supplier-name" {...register("name")} className={fieldClass} />
        </Field>
        <Field id="supplier-nit" label={`${t("fields.nit")} ${tCommon("optional")}`}>
          <input id="supplier-nit" inputMode="numeric" {...register("nit")} className={`${fieldClass} font-mono-data`} />
        </Field>
        {fullForm && (
          <>
            <Field id="supplier-category" label={`${t("fields.category")} ${tCommon("optional")}`}>
              <select id="supplier-category" {...register("category")} className={fieldClass}>
                <option value="">{t("noCategory")}</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {tCategories(c)}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field id="supplier-phone" label={`${t("fields.phone")} ${tCommon("optional")}`}>
                <input id="supplier-phone" type="tel" inputMode="tel" {...register("phone")} className={fieldClass} />
              </Field>
              <Field id="supplier-email" label={`${t("fields.email")} ${tCommon("optional")}`} error={errors.email && t("emailError")}>
                <input id="supplier-email" type="email" {...register("email")} className={fieldClass} />
              </Field>
            </div>
            <Field id="supplier-notes" label={`${t("fields.notes")} ${tCommon("optional")}`}>
              <textarea id="supplier-notes" rows={2} {...register("notes")} className={fieldClass} />
            </Field>
          </>
        )}
        <button type="submit" disabled={isSubmitting} className={`${primaryButtonClass} w-full`}>
          {isSubmitting ? tCommon("saving") : t("save")}
        </button>
      </form>
    </Modal>
  );
}
