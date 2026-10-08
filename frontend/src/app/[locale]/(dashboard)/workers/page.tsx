"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { Field, fieldClass, primaryButtonClass } from "@/components/ui/form";
import { Reveal } from "@/components/ui/reveal";
import { ProjectSelect } from "@/components/projects/project-select";
import { useWorkers, useCreateWorker, Worker } from "@/lib/workers-service";
import { useAuthStore } from "@/store/auth.store";
import { useApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/store/toast.store";

const schema = z.object({
  name: z.string().min(3),
  documentId: z.string().min(5),
  position: z.string().min(2),
  projectId: z.string().uuid().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export default function WorkersPage() {
  const t = useTranslations("workers");
  const tv = useTranslations("validation");
  const tCommon = useTranslations("common");
  const tPicker = useTranslations("projectPicker");
  const isAdmin = useAuthStore((s) => s.user?.role === "ADMIN");
  const errorMessage = useApiErrorMessage();
  const [modalOpen, setModalOpen] = useState(false);
  const { data, isLoading } = useWorkers({ limit: 100 });
  const createWorker = useCreateWorker();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", documentId: "", position: "", projectId: "" },
  });

  async function onSubmit(values: FormValues) {
    try {
      await createWorker.mutateAsync({ ...values, projectId: values.projectId || undefined });
      toast.success(t("created"));
      reset();
      setModalOpen(false);
    } catch (error) {
      toast.error(errorMessage(error, { 409: t("duplicateDocument") }));
    }
  }

  return (
    <>
      <DashboardHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          isAdmin && (
            <button type="button" onClick={() => setModalOpen(true)} className={primaryButtonClass}>
              <Plus size={15} aria-hidden /> {t("newWorker")}
            </button>
          )
        }
      />

      <main className="p-4 sm:p-6">
        <Reveal>
          <DataTable<Worker>
            rows={data?.data ?? []}
            isLoading={isLoading}
            rowKey={(w) => w.id}
            emptyMessage={t("empty")}
            columns={[
              { id: "name", header: t("name"), accessor: (w) => w.name, primary: true },
              ...(isAdmin
                ? [{ id: "document", header: t("document"), accessor: (w: Worker) => <span className="font-mono-data">{w.documentId}</span> }]
                : []),
              { id: "position", header: t("position"), accessor: (w) => w.position },
              { id: "project", header: t("assignedProject"), accessor: (w) => w.project?.name ?? t("unassigned") },
              {
                id: "status",
                header: t("status"),
                accessor: (w) => (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      w.status === "ACTIVE" ? "bg-success/15 text-success" : "bg-surface-2 text-ink-muted"
                    }`}
                  >
                    {t(`statuses.${w.status}`)}
                  </span>
                ),
              },
            ]}
          />
        </Reveal>
      </main>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t("newWorker")}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <Field id="worker-name" label={t("name")} error={errors.name && tv("minChars", { min: 3 })}>
            <input id="worker-name" {...register("name")} autoComplete="off" className={fieldClass} />
          </Field>
          <Field id="worker-document" label={t("document")} error={errors.documentId && tv("minChars", { min: 5 })}>
            <input id="worker-document" inputMode="numeric" {...register("documentId")} className={fieldClass} />
          </Field>
          <Field id="worker-position" label={t("position")} error={errors.position && tv("minChars", { min: 2 })}>
            <input
              id="worker-position"
              {...register("position")}
              placeholder={t("positionPlaceholder")}
              className={fieldClass}
            />
          </Field>
          <Field id="worker-project" label={`${tPicker("label")} ${tCommon("optional")}`}>
            <ProjectSelect id="worker-project" allowNone {...register("projectId")} />
          </Field>
          <button type="submit" disabled={createWorker.isPending} className={`${primaryButtonClass} w-full`}>
            {createWorker.isPending ? tCommon("saving") : t("create")}
          </button>
        </form>
      </Modal>
    </>
  );
}
