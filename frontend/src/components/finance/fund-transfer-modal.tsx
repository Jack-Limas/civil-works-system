"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/modal";
import { Field, fieldClass, primaryButtonClass } from "@/components/ui/form";
import { ProjectSelect } from "@/components/projects/project-select";
import { MoneyInput } from "./money-input";
import { useCreateFundTransfer } from "@/lib/finance-service";
import { useUsers } from "@/lib/users-service";
import { useApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/store/toast.store";
import { PAYMENT_METHODS } from "@/types/finance";

const schema = z.object({
  residentId: z.string().uuid(),
  projectId: z.string(),
  amount: z.number().positive().optional(),
  date: z.string(),
  method: z.enum(PAYMENT_METHODS).or(z.literal("")),
  notes: z.string().max(500),
});

type FormValues = z.infer<typeof schema>;

function localToday() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Admin-only: send money to a resident engineer's petty cash. */
export function FundTransferModal({
  open,
  onClose,
  defaultResidentId,
}: {
  open: boolean;
  onClose: () => void;
  defaultResidentId?: string;
}) {
  const t = useTranslations("cash");
  const tMethods = useTranslations("expense.paymentMethods");
  const tForm = useTranslations("expenseForm");
  const tCommon = useTranslations("common");
  const errorMessage = useApiErrorMessage();
  const createTransfer = useCreateFundTransfer();
  const { data: residents, isLoading } = useUsers("RESIDENT_ENGINEER", open);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { residentId: "", projectId: "", amount: undefined, date: "", method: "TRANSFER", notes: "" },
  });

  useEffect(() => {
    if (open) {
      reset({
        residentId: defaultResidentId ?? "",
        projectId: "",
        amount: undefined,
        date: localToday(),
        method: "TRANSFER",
        notes: "",
      });
    }
  }, [open, defaultResidentId, reset]);

  async function onSubmit(values: FormValues) {
    if (!values.amount) {
      setError("amount", { type: "required" });
      return;
    }
    try {
      await createTransfer.mutateAsync({
        residentId: values.residentId,
        projectId: values.projectId || undefined,
        amount: values.amount,
        date: values.date || undefined,
        method: values.method || undefined,
        notes: values.notes.trim() || undefined,
      });
      toast.success(t("created"));
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("transferTitle")}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
        <Field id="transfer-resident" label={t("fields.resident")} error={errors.residentId && t("errors.resident")}>
          <select id="transfer-resident" {...register("residentId")} disabled={isLoading} className={fieldClass}>
            <option value="" disabled>
              {isLoading ? tCommon("loading") : t("residentPlaceholder")}
            </option>
            {residents?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>
        <Field id="transfer-amount" label={t("fields.amount")} error={errors.amount && t("errors.amount")}>
          <Controller
            control={control}
            name="amount"
            render={({ field }) => (
              <MoneyInput id="transfer-amount" ref={field.ref} value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} />
            )}
          />
        </Field>
        <Field id="transfer-project" label={t("fields.project")}>
          <ProjectSelect id="transfer-project" allowNone {...register("projectId")} />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field id="transfer-date" label={t("fields.date")}>
            <input id="transfer-date" type="date" {...register("date")} className={fieldClass} />
          </Field>
          <Field id="transfer-method" label={t("fields.method")}>
            <select id="transfer-method" {...register("method")} className={fieldClass}>
              <option value="">{tForm("methodPlaceholder")}</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {tMethods(m)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field id="transfer-notes" label={`${t("fields.notes")} ${tCommon("optional")}`}>
          <textarea id="transfer-notes" rows={2} maxLength={500} {...register("notes")} placeholder={t("notesPlaceholder")} className={fieldClass} />
        </Field>
        <button type="submit" disabled={isSubmitting} className={`${primaryButtonClass} w-full`}>
          {isSubmitting ? tCommon("saving") : t("submit")}
        </button>
      </form>
    </Modal>
  );
}
