"use client";

import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { UserRound } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Field, fieldClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/form";
import { Reveal, RevealItem } from "@/components/ui/reveal";
import { ProjectSelect } from "@/components/projects/project-select";
import { CostsTabs } from "@/components/finance/costs-tabs";
import { CategoryPicker } from "@/components/finance/category-picker";
import { SupplierPicker } from "@/components/finance/supplier-picker";
import { MoneyInput } from "@/components/finance/money-input";
import { SupportFileInput } from "@/components/finance/support-file-input";
import { BudgetImpactPanel } from "@/components/finance/budget-impact-panel";
import { useCreateExpense } from "@/lib/expenses-service";
import { useProjects } from "@/lib/projects-service";
import { useApiErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "@/store/toast.store";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/types/finance";

const schema = z.object({
  projectId: z.string().uuid(),
  category: z.enum(EXPENSE_CATEGORIES),
  supplier: z.object({ id: z.string(), name: z.string() }).nullable(),
  date: z.string().min(1),
  paymentMethod: z.enum(PAYMENT_METHODS).or(z.literal("")),
  amount: z.number().positive().optional(),
  description: z.string().max(500),
  invoiceNumber: z.string().max(60),
});

type FormValues = z.infer<typeof schema>;

/** yyyy-mm-dd in the user's timezone (toISOString would use UTC and may shift the day). */
function localToday() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export default function RegisterExpensePage() {
  const t = useTranslations("expenseForm");
  const tFields = useTranslations("expense.fields");
  const tMethods = useTranslations("expense.paymentMethods");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const errorMessage = useApiErrorMessage();
  const user = useAuthStore((s) => s.user);
  const isResident = user?.role === "RESIDENT_ENGINEER";
  const createExpense = useCreateExpense();
  const { data: projects } = useProjects({ limit: 100 });

  const [support, setSupport] = useState<File | null>(null);
  const [compressing, setCompressing] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      projectId: "",
      category: "MATERIALS",
      supplier: null,
      date: "",
      paymentMethod: "",
      amount: undefined,
      description: "",
      invoiceNumber: "",
    },
  });

  // Today's date is set after mount (not during render) to keep the component pure
  useEffect(() => {
    if (!getValues("date")) setValue("date", localToday());
  }, [getValues, setValue]);

  // A resident with a single project gets it preselected
  useEffect(() => {
    const list = projects?.data ?? [];
    if (list.length === 1 && !getValues("projectId")) setValue("projectId", list[0].id, { shouldValidate: true });
  }, [projects, getValues, setValue]);

  const [projectId, amount] = useWatch({ control, name: ["projectId", "amount"] });

  async function onSubmit(values: FormValues) {
    if (!values.amount) {
      setError("amount", { type: "required" });
      return;
    }
    const form = new FormData();
    form.append("projectId", values.projectId);
    form.append("category", values.category);
    form.append("amount", String(values.amount));
    form.append("date", values.date);
    if (values.supplier) form.append("supplierId", values.supplier.id);
    if (values.paymentMethod) form.append("paymentMethod", values.paymentMethod);
    if (values.description.trim()) form.append("description", values.description.trim());
    if (values.invoiceNumber.trim()) form.append("invoiceNumber", values.invoiceNumber.trim());
    if (support) form.append("support", support);

    try {
      const expense = await createExpense.mutateAsync(form);
      toast.success(expense.status === "PENDING" ? t("createdPending") : t("createdApproved"));
      router.push("/expenses");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  const busy = isSubmitting || compressing;

  return (
    <>
      <DashboardHeader title={t("title")} subtitle={t("subtitle")} />

      <main className="space-y-5 p-4 sm:p-6">
        <CostsTabs />

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mx-auto max-w-6xl">
          <Reveal className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <RevealItem className="order-1 space-y-5 lg:col-span-2">
              <section className="space-y-4 rounded-xl border border-line bg-surface p-4 sm:p-5">
                <Field id="expense-project" label={tFields("project")} error={errors.projectId && t("errors.project")}>
                  <ProjectSelect id="expense-project" {...register("projectId")} />
                </Field>

                <div>
                  <p id="expense-category-label" className="mb-1 text-sm font-medium text-ink">
                    {tFields("category")}
                  </p>
                  <Controller
                    control={control}
                    name="category"
                    render={({ field }) => (
                      <CategoryPicker value={field.value} onChange={field.onChange} labelledBy="expense-category-label" />
                    )}
                  />
                </div>

                <Field id="expense-amount" label={tFields("amount")} error={errors.amount && t("errors.amount")}>
                  <Controller
                    control={control}
                    name="amount"
                    render={({ field }) => (
                      <MoneyInput
                        id="expense-amount"
                        ref={field.ref}
                        value={field.value}
                        onValueChange={field.onChange}
                        onBlur={field.onBlur}
                        placeholder={t("amountPlaceholder")}
                        aria-invalid={!!errors.amount}
                      />
                    )}
                  />
                </Field>

                <div>
                  <p className="mb-1 text-sm font-medium text-ink">
                    {tFields("supplier")} <span className="font-normal text-ink-muted">{tCommon("optional")}</span>
                  </p>
                  <Controller
                    control={control}
                    name="supplier"
                    render={({ field }) => <SupplierPicker value={field.value} onChange={field.onChange} />}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field id="expense-date" label={tFields("date")} error={errors.date && t("errors.date")}>
                    <input id="expense-date" type="date" {...register("date")} className={fieldClass} />
                  </Field>
                  <Field id="expense-method" label={tFields("paymentMethod")}>
                    <select id="expense-method" {...register("paymentMethod")} className={fieldClass}>
                      <option value="">{t("methodPlaceholder")}</option>
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {tMethods(m)}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div>
                  <p className="mb-1 text-sm font-medium text-ink">{tFields("responsible")}</p>
                  <p className="flex min-h-11 items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 text-sm text-ink-muted">
                    <UserRound size={15} aria-hidden />
                    {user &&
                      (isResident
                        ? t("responsibleResident", { name: user.name })
                        : t("responsibleCompany", { name: user.name }))}
                  </p>
                </div>

                <Field id="expense-description" label={`${tFields("description")} ${tCommon("optional")}`}>
                  <textarea
                    id="expense-description"
                    rows={3}
                    maxLength={500}
                    {...register("description")}
                    placeholder={t("descriptionPlaceholder")}
                    className={fieldClass}
                  />
                </Field>

                <Field id="expense-invoice" label={`${tFields("invoiceNumber")} ${tCommon("optional")}`}>
                  <input
                    id="expense-invoice"
                    maxLength={60}
                    {...register("invoiceNumber")}
                    placeholder={t("invoicePlaceholder")}
                    className={fieldClass}
                  />
                </Field>

                <div>
                  <p className="mb-1 text-sm font-medium text-ink">
                    {tFields("support")} <span className="font-normal text-ink-muted">{tCommon("optional")}</span>
                  </p>
                  <SupportFileInput file={support} onChange={setSupport} onBusyChange={setCompressing} />
                </div>
              </section>
            </RevealItem>

            <RevealItem className="order-2 lg:row-span-2">
              <div className="lg:sticky lg:top-4">
                <BudgetImpactPanel
                  projectId={projectId}
                  amount={amount ?? 0}
                  isResident={isResident}
                  residentId={user?.id}
                />
              </div>
            </RevealItem>

            <RevealItem className="order-3 lg:col-span-2">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Link href="/expenses" className={secondaryButtonClass}>
                  {t("cancel")}
                </Link>
                <button type="submit" disabled={busy} className={`${primaryButtonClass} min-h-12 sm:min-w-48`}>
                  {isSubmitting ? t("submitting") : t("submit")}
                </button>
              </div>
            </RevealItem>
          </Reveal>
        </form>
      </main>
    </>
  );
}
