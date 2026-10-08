"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useFormatter, useTranslations } from "next-intl";
import { AlertTriangle, Plus } from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { Field, fieldClass, primaryButtonClass } from "@/components/ui/form";
import { Reveal, RevealItem } from "@/components/ui/reveal";
import { useMaterials, useCreateMaterial, Material } from "@/lib/materials-service";
import { useAuthStore } from "@/store/auth.store";
import { useApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/store/toast.store";

const schema = z.object({
  name: z.string().min(2),
  unit: z.string().min(1),
  stockMinimum: z.coerce.number().min(0),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

export default function MaterialsPage() {
  const t = useTranslations("materials");
  const tv = useTranslations("validation");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const isAdmin = useAuthStore((s) => s.user?.role === "ADMIN");
  const errorMessage = useApiErrorMessage();
  const [modalOpen, setModalOpen] = useState(false);
  const { data, isLoading } = useMaterials({ limit: 100 });
  const createMaterial = useCreateMaterial();
  const materials = data?.data ?? [];
  const lowCount = materials.filter((m) => m.stockAvailable < m.stockMinimum).length;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({ resolver: zodResolver(schema), defaultValues: { stockMinimum: 0 } });

  async function onSubmit(values: FormValues) {
    try {
      await createMaterial.mutateAsync(values);
      toast.success(t("created"));
      reset();
      setModalOpen(false);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  const qty = (n: number, unit: string) => `${format.number(n)} ${unit}`;

  return (
    <>
      <DashboardHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          isAdmin && (
            <button type="button" onClick={() => setModalOpen(true)} className={primaryButtonClass}>
              <Plus size={15} aria-hidden /> {t("newMaterial")}
            </button>
          )
        }
      />

      <main className="p-4 sm:p-6">
        <Reveal className="space-y-4">
          {lowCount > 0 && (
            <RevealItem>
              <p className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-ink">
                <AlertTriangle size={16} className="shrink-0 text-warning" aria-hidden />
                {t("lowStockWarning", { count: lowCount })}
              </p>
            </RevealItem>
          )}
          <RevealItem>
            <DataTable<Material>
              rows={materials}
              isLoading={isLoading}
              rowKey={(m) => m.id}
              emptyMessage={t("empty")}
              columns={[
                { id: "name", header: t("name"), accessor: (m) => m.name, primary: true },
                { id: "unit", header: t("unit"), accessor: (m) => m.unit },
                {
                  id: "available",
                  header: t("stockAvailable"),
                  accessor: (m) => <span className="font-mono-data">{qty(m.stockAvailable, m.unit)}</span>,
                  align: "right",
                },
                {
                  id: "minimum",
                  header: t("stockMinimum"),
                  accessor: (m) => <span className="font-mono-data">{qty(m.stockMinimum, m.unit)}</span>,
                  align: "right",
                },
                {
                  id: "status",
                  header: t("status"),
                  accessor: (m) =>
                    m.stockAvailable < m.stockMinimum ? (
                      <span className="rounded-full bg-critical/15 px-2 py-0.5 text-xs font-medium text-critical">
                        {t("stock.low")}
                      </span>
                    ) : (
                      <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                        {t("stock.ok")}
                      </span>
                    ),
                },
              ]}
            />
          </RevealItem>
        </Reveal>
      </main>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t("newMaterial")}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <Field id="material-name" label={t("name")} error={errors.name && tv("minChars", { min: 2 })}>
            <input id="material-name" {...register("name")} placeholder={t("namePlaceholder")} className={fieldClass} />
          </Field>
          <Field id="material-unit" label={t("unit")} error={errors.unit && tv("required")}>
            <input id="material-unit" {...register("unit")} placeholder={t("unitPlaceholder")} className={fieldClass} />
          </Field>
          <Field id="material-min" label={t("stockMinimum")} error={errors.stockMinimum && tv("min", { min: 0 })}>
            <input
              id="material-min"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              {...register("stockMinimum")}
              className={fieldClass}
            />
          </Field>
          <button type="submit" disabled={createMaterial.isPending} className={`${primaryButtonClass} w-full`}>
            {createMaterial.isPending ? tCommon("saving") : t("create")}
          </button>
        </form>
      </Modal>
    </>
  );
}
