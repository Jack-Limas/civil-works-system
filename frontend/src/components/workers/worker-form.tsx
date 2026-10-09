"use client";

import { useId } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { Field, fieldClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/form";
import { ProjectSelect } from "@/components/projects/project-select";
import { useCreateWorker, useUpdateWorker, type Worker } from "@/lib/workers-service";
import { apiErrorCode } from "@/lib/api-client";
import { useApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/store/toast.store";

const PHONE = /^[\d\s+()-]{7,30}$/;
const schema = z.object({
  name: z.string().trim().min(2).max(120),
  documentId: z.string().trim().regex(/^[A-Za-z0-9.-]{5,20}$/),
  position: z.string().trim().min(2).max(80),
  projectId: z.string(),
  phone: z.string().trim().refine((v) => v === "" || PHONE.test(v)),
});
type FormValues = z.infer<typeof schema>;

/** Admin-only create/edit. Trades already in use are suggested so spellings stay consistent. */
export function WorkerForm({
  worker,
  positions,
  onDone,
  onCancel,
}: {
  worker: Worker | null;
  positions: string[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("workers");
  const tForm = useTranslations("workers.form");
  const errorMessage = useApiErrorMessage();
  const create = useCreateWorker();
  const update = useUpdateWorker();
  const listId = useId();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: worker?.name ?? "",
      documentId: worker?.documentId ?? "",
      position: worker?.position ?? "",
      projectId: worker?.projectId ?? "",
      phone: worker?.phone ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      if (worker) {
        await update.mutateAsync({
          id: worker.id,
          input: { ...values, projectId: values.projectId || null, phone: values.phone || null },
        });
        toast.success(t("toasts.updated"));
      } else {
        await create.mutateAsync({ ...values, projectId: values.projectId || undefined, phone: values.phone || undefined });
        toast.success(t("created"));
      }
      onDone();
    } catch (error) {
      if (apiErrorCode(error) === "DOCUMENT_TAKEN") {
        setError("documentId", { type: "server", message: t("duplicateDocument") });
        return;
      }
      toast.error(errorMessage(error));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <Field id="worker-name" label={t("name")} error={errors.name && tForm("errors.name")}>
        <input id="worker-name" autoComplete="off" {...register("name")} aria-invalid={!!errors.name} className={fieldClass} />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          id="worker-document"
          label={t("document")}
          error={errors.documentId && (errors.documentId.type === "server" ? errors.documentId.message : tForm("errors.document"))}
        >
          <input id="worker-document" inputMode="text" autoComplete="off" {...register("documentId")} aria-invalid={!!errors.documentId} className={`${fieldClass} font-mono-data`} />
        </Field>
        <Field id="worker-phone" label={t("phone")} error={errors.phone && tForm("errors.phone")}>
          <input id="worker-phone" type="tel" inputMode="tel" autoComplete="off" {...register("phone")} placeholder={t("phonePlaceholder")} aria-invalid={!!errors.phone} className={fieldClass} />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="worker-position" label={t("position")} error={errors.position && tForm("errors.position")}>
          <input id="worker-position" list={listId} autoComplete="off" {...register("position")} placeholder={t("positionPlaceholder")} aria-invalid={!!errors.position} className={fieldClass} />
          <datalist id={listId}>
            {positions.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </Field>
        <Field id="worker-project" label={t("assignedProject")}>
          <ProjectSelect id="worker-project" allowNone noneLabel={t("unassigned")} {...register("projectId")} />
        </Field>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-ink-muted">
        <ShieldCheck size={14} aria-hidden /> {tForm("sensitive")}
      </p>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className={secondaryButtonClass}>
          {tForm("cancel")}
        </button>
        <button type="submit" disabled={isSubmitting} className={`${primaryButtonClass} sm:min-w-40`}>
          {isSubmitting ? tForm("saving") : worker ? tForm("save") : t("create")}
        </button>
      </div>
    </form>
  );
}
