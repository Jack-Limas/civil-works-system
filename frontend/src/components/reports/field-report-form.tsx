"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Minus, Plus, Sparkles } from "lucide-react";
import { Field, fieldClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/form";
import { CompiledDaySections, WEATHER_ICON, WEATHER_TONE } from "./compiled-day";
import { useCreateFieldReport, useUpdateFieldReport } from "@/lib/reports-service";
import { useApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/store/toast.store";
import { WEATHER_VALUES, type CompiledDay, type FieldReport } from "@/types/reports";

const MAX_WORKERS = 5000;

const schema = z.object({
  weather: z.enum(WEATHER_VALUES).nullable(),
  workersOnSite: z.number().int().min(0).max(MAX_WORKERS),
  summary: z.string().trim().min(10).max(4000),
  issues: z.string().trim().max(4000),
});
type FormValues = z.infer<typeof schema>;

/** Draft text from what was already recorded today, so the resident only adjusts it. */
function draftFrom(compiled: CompiledDay) {
  return {
    summary: compiled.activities.map((a) => `• ${a.name}${a.observations ? `: ${a.observations}` : ""}`).join("\n"),
    issues: compiled.incidents.map((i) => `• ${i.description}`).join("\n"),
  };
}

type Props =
  | { mode: "create"; projectId: string; compiled: CompiledDay; onDone: (report: FieldReport) => void; onExists: (id: string) => void; onCancel: () => void }
  | { mode: "edit"; report: FieldReport; onDone: (report: FieldReport) => void; onCancel: () => void };

export function FieldReportForm(props: Props) {
  const t = useTranslations("fieldReports");
  const errorMessage = useApiErrorMessage();
  const create = useCreateFieldReport();
  const update = useUpdateFieldReport();

  const draft = props.mode === "create" ? draftFrom(props.compiled) : null;
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues:
      props.mode === "edit"
        ? {
            weather: props.report.weather,
            workersOnSite: props.report.workersOnSite ?? 0,
            summary: props.report.summary,
            issues: props.report.issues ?? "",
          }
        : { weather: null, workersOnSite: 0, summary: draft?.summary ?? "", issues: draft?.issues ?? "" },
  });

  async function onSubmit(values: FormValues) {
    const input = {
      weather: values.weather ?? undefined,
      workersOnSite: values.workersOnSite,
      summary: values.summary.trim(),
      issues: values.issues.trim() || undefined,
    };
    try {
      if (props.mode === "create") {
        const report = await create.mutateAsync({ projectId: props.projectId, ...input });
        toast.success(t("form.created"));
        props.onDone(report);
      } else {
        const report = await update.mutateAsync({ id: props.report.id, input });
        toast.success(t("form.updated"));
        props.onDone(report);
      }
    } catch (error) {
      // Someone (or another tab) already sent today's log: take the user to it
      const existingId = isAxiosError<{ existingId?: string }>(error) && error.response?.status === 409 ? error.response.data?.existingId : undefined;
      if (props.mode === "create" && existingId) {
        toast.info(t("form.exists"));
        props.onExists(existingId);
        return;
      }
      toast.error(errorMessage(error));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {props.mode === "create" && (
        <section className="rounded-xl border border-ai/30 bg-ai/5 p-4">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Sparkles size={14} className="text-ai" aria-hidden /> {t("form.compiled")}
          </h3>
          <p className="mb-3 text-xs text-ink-muted">{t("form.compiledHint")}</p>
          <CompiledDaySections compiled={props.compiled} />
        </section>
      )}

      <div>
        <p id="weather-label" className="mb-1.5 text-sm font-medium text-ink">
          {t("weather.label")}
        </p>
        <Controller
          control={control}
          name="weather"
          render={({ field }) => (
            <div role="radiogroup" aria-labelledby="weather-label" className="grid grid-cols-4 gap-2">
              {WEATHER_VALUES.map((w) => {
                const Icon = WEATHER_ICON[w];
                const selected = field.value === w;
                return (
                  <button
                    key={w}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => field.onChange(selected ? null : w)}
                    className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                      selected ? "border-accent bg-accent/10 text-ink" : "border-line bg-surface text-ink-muted hover:border-accent/40"
                    }`}
                  >
                    <Icon size={22} className={selected ? WEATHER_TONE[w] : ""} aria-hidden />
                    {t(`weather.${w}`)}
                  </button>
                );
              })}
            </div>
          )}
        />
      </div>

      <div>
        <p id="workers-label" className="mb-1.5 text-sm font-medium text-ink">
          {t("fields.workers")}
        </p>
        <Controller
          control={control}
          name="workersOnSite"
          render={({ field }) => (
            <div className="flex items-center gap-3" role="group" aria-labelledby="workers-label">
              <button
                type="button"
                onClick={() => field.onChange(Math.max(0, field.value - 1))}
                disabled={field.value <= 0}
                aria-label={t("form.decrease")}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-surface text-ink transition-colors hover:border-accent/50 disabled:opacity-40"
              >
                <Minus size={18} aria-hidden />
              </button>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={MAX_WORKERS}
                value={field.value}
                onChange={(e) => field.onChange(Math.min(MAX_WORKERS, Math.max(0, Math.floor(Number(e.target.value) || 0))))}
                aria-labelledby="workers-label"
                className={`${fieldClass} h-12 w-24 text-center font-mono-data text-lg`}
              />
              <button
                type="button"
                onClick={() => field.onChange(Math.min(MAX_WORKERS, field.value + 1))}
                aria-label={t("form.increase")}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-surface text-ink transition-colors hover:border-accent/50"
              >
                <Plus size={18} aria-hidden />
              </button>
              <span className="text-sm text-ink-muted">{t("workersCount", { count: field.value })}</span>
            </div>
          )}
        />
      </div>

      <Field id="log-summary" label={t("fields.summary")} error={errors.summary && t("form.summaryError")}>
        <textarea
          id="log-summary"
          rows={5}
          maxLength={4000}
          {...register("summary")}
          placeholder={t("form.summaryPlaceholder")}
          aria-invalid={!!errors.summary}
          className={fieldClass}
        />
      </Field>

      <Field id="log-issues" label={t("fields.issues")}>
        <textarea id="log-issues" rows={3} maxLength={4000} {...register("issues")} placeholder={t("form.issuesPlaceholder")} className={fieldClass} />
      </Field>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={props.onCancel} className={secondaryButtonClass}>
          {t("form.cancel")}
        </button>
        <button type="submit" disabled={isSubmitting} className={`${primaryButtonClass} min-h-12 sm:min-w-44`}>
          {isSubmitting ? t("form.saving") : props.mode === "create" ? t("form.submit") : t("form.update")}
        </button>
      </div>
    </form>
  );
}
