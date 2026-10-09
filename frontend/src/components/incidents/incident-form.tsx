"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Field, fieldClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/form";
import { ProjectSelect } from "@/components/projects/project-select";
import { SupportFileInput } from "@/components/finance/support-file-input";
import { useProjects } from "@/lib/projects-service";
import { INCIDENT_PRIORITIES, INCIDENT_TYPES, useAddIncidentPhoto, useReportIncident, type IncidentDetail } from "@/lib/incidents-service";
import { useApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/store/toast.store";
import { PRIORITY_TONE, TYPE_ICON } from "./incident-badges";

const schema = z.object({
  projectId: z.string().uuid(),
  type: z.enum(INCIDENT_TYPES),
  priority: z.enum(INCIDENT_PRIORITIES),
  description: z.string().trim().min(5).max(2000),
});
type FormValues = z.infer<typeof schema>;

/**
 * Report an incident in a few taps (resident on site, one hand): the project is
 * preselected when there is only one, type and priority are big buttons and the
 * photo can come straight from the camera (compressed in a Web Worker).
 */
export function IncidentForm({ onDone, onCancel }: { onDone: (incident: IncidentDetail) => void; onCancel: () => void }) {
  const t = useTranslations("incidents");
  const tForm = useTranslations("incidents.form");
  const errorMessage = useApiErrorMessage();
  const report = useReportIncident();
  const addPhoto = useAddIncidentPhoto();
  const { data: projects } = useProjects({ limit: 100 });
  const [photo, setPhoto] = useState<File | null>(null);
  const [compressing, setCompressing] = useState(false);

  const list = projects?.data ?? [];
  const onlyProject = list.length === 1 ? list[0].id : "";

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    // values (not defaultValues) so the single project is selected once projects load
    values: { projectId: onlyProject, type: "MATERIAL_SHORTAGE", priority: "MEDIUM", description: "" },
    resetOptions: { keepDirtyValues: true },
  });

  async function onSubmit(values: FormValues) {
    try {
      const incident = await report.mutateAsync(values);
      if (photo) {
        try {
          await addPhoto.mutateAsync({ incident, file: photo });
        } catch {
          // The incident exists; the photo can be added later from its detail
          toast.info(tForm("photoFailed"));
        }
      }
      toast.success(t("created"));
      onDone(incident);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {list.length !== 1 && (
        <Field id="incident-project" label={tForm("project")} error={errors.projectId && tForm("errors.project")}>
          <ProjectSelect id="incident-project" {...register("projectId")} className={`${fieldClass} min-h-12`} />
        </Field>
      )}

      <div>
        <p id="incident-type-label" className="mb-1.5 text-sm font-medium text-ink">
          {tForm("type")}
        </p>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <div role="radiogroup" aria-labelledby="incident-type-label" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {INCIDENT_TYPES.map((value) => {
                const Icon = TYPE_ICON[value];
                const selected = field.value === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => field.onChange(value)}
                    className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-center text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                      selected ? "border-accent bg-accent/10 text-ink" : "border-line bg-surface text-ink-muted hover:border-accent/40"
                    }`}
                  >
                    <Icon size={20} className={selected ? "text-accent" : ""} aria-hidden />
                    {t(`types.${value}`)}
                  </button>
                );
              })}
            </div>
          )}
        />
      </div>

      <div>
        <p id="incident-priority-label" className="mb-1.5 text-sm font-medium text-ink">
          {tForm("priority")}
        </p>
        <Controller
          control={control}
          name="priority"
          render={({ field }) => (
            <div role="radiogroup" aria-labelledby="incident-priority-label" className="grid grid-cols-3 gap-2">
              {INCIDENT_PRIORITIES.map((value) => {
                const selected = field.value === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => field.onChange(value)}
                    className={`min-h-12 rounded-xl border text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                      selected ? `border-transparent ${PRIORITY_TONE[value]} ring-2 ring-current` : "border-line bg-surface text-ink-muted"
                    }`}
                  >
                    {t(`priorities.${value}`)}
                  </button>
                );
              })}
            </div>
          )}
        />
      </div>

      <Field id="incident-description" label={tForm("description")} error={errors.description && tForm("errors.description")}>
        <textarea
          id="incident-description"
          rows={4}
          maxLength={2000}
          {...register("description")}
          placeholder={tForm("descriptionPlaceholder")}
          aria-invalid={!!errors.description}
          className={fieldClass}
        />
      </Field>

      <div>
        <p className="mb-1.5 text-sm font-medium text-ink">{tForm("photo")}</p>
        <SupportFileInput file={photo} onChange={setPhoto} onBusyChange={setCompressing} imagesOnly hint={tForm("photoHint")} typeError={tForm("photoType")} />
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className={secondaryButtonClass}>
          {t("transition.cancel")}
        </button>
        <button type="submit" disabled={isSubmitting || compressing} className={`${primaryButtonClass} min-h-12 sm:min-w-44`}>
          {isSubmitting ? tForm("saving") : tForm("submit")}
        </button>
      </div>
    </form>
  );
}
