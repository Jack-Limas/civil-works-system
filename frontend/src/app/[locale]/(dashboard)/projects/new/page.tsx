"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { ArrowLeft, Building2, Calendar, UserCog, CheckCircle2, Circle, ImagePlus, LucideIcon } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { AdminOnly } from "@/components/auth/admin-only";
import { Field, fieldClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/form";
import { Reveal, RevealItem } from "@/components/ui/reveal";
import { useCreateProject, PROJECT_TYPES } from "@/lib/projects-service";
import { useUploadEvidence } from "@/lib/evidence-service";
import { useUsers } from "@/lib/users-service";
import { useFormatCOP } from "@/lib/format";
import { useApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/store/toast.store";

const MS_PER_DAY = 86_400_000;

const schema = z
  .object({
    name: z.string().min(3),
    type: z.enum(PROJECT_TYPES),
    municipality: z.string().min(2),
    address: z.string().optional(),
    startDate: z.string().min(1),
    estimatedEndDate: z.string().min(1),
    budget: z.coerce.number().positive(),
    responsibleId: z.string().uuid(),
  })
  .refine((v) => !v.startDate || !v.estimatedEndDate || v.estimatedEndDate > v.startDate, {
    path: ["estimatedEndDate"],
    message: "endBeforeStart",
  });

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

function SectionCard({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent" aria-hidden>
          <Icon size={16} />
        </div>
        <h2 className="font-semibold text-ink">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function CheckItem({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      {done ? (
        <CheckCircle2 size={15} className="text-success" aria-hidden />
      ) : (
        <Circle size={15} className="text-ink-muted" aria-hidden />
      )}
      {label}
    </li>
  );
}

function NewProjectForm() {
  const t = useTranslations("projects");
  const tf = useTranslations("projects.form");
  const tCommon = useTranslations("common");
  const tUsers = useTranslations("users");
  const router = useRouter();
  const formatCOP = useFormatCOP();
  const errorMessage = useApiErrorMessage();
  const createProject = useCreateProject();
  const uploadEvidence = useUploadEvidence();
  const { data: users, isLoading: usersLoading } = useUsers();

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  // Release the object URL when the preview changes or the page unmounts
  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: PROJECT_TYPES[0], responsibleId: "", name: "", municipality: "" },
  });

  const values = useWatch({ control });
  const budget = Number(values.budget ?? 0);
  const basicDone = !!(values.name && values.municipality);
  const datesDone = !!(values.startDate && values.estimatedEndDate && budget > 0);
  const responsibleDone = !!values.responsibleId;

  const durationDays =
    values.startDate && values.estimatedEndDate
      ? Math.max(0, Math.round((Date.parse(values.estimatedEndDate) - Date.parse(values.startDate)) / MS_PER_DAY))
      : null;

  function handleCoverSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  async function onSubmit(formValues: FormValues) {
    let created;
    try {
      created = await createProject.mutateAsync(formValues);
    } catch (error) {
      toast.error(errorMessage(error));
      return;
    }

    if (coverFile) {
      const formData = new FormData();
      formData.append("projectId", created.id);
      formData.append("description", tf("coverDescription"));
      formData.append("file", coverFile);
      try {
        await uploadEvidence.mutateAsync(formData);
      } catch {
        toast.error(tf("coverFailed"));
      }
    }

    toast.success(tf("created"));
    router.push(`/projects/${created.id}`);
  }

  const dateError = (key: "startDate" | "estimatedEndDate") => {
    const error = errors[key];
    if (!error) return undefined;
    return error.message === "endBeforeStart" ? tf("endBeforeStart") : tf("dateRequired");
  };

  return (
    <>
      <DashboardHeader title={t("newProject")} subtitle={tf("subtitle")} />

      <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">
        <Link href="/projects" className="mb-4 flex w-fit items-center gap-1 text-sm text-ink-muted transition-colors hover:text-ink">
          <ArrowLeft size={14} aria-hidden /> {tf("back")}
        </Link>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Reveal className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <RevealItem className="space-y-5 lg:col-span-2">
              <SectionCard icon={Building2} title={tf("sections.basic")}>
                <div className="space-y-3">
                  <Field id="project-name" label={t("fields.name")} error={errors.name && tf("nameError")}>
                    <input id="project-name" {...register("name")} placeholder={tf("namePlaceholder")} className={fieldClass} />
                  </Field>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field id="project-type" label={t("fields.type")}>
                      <select id="project-type" {...register("type")} className={fieldClass}>
                        {PROJECT_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {t(`types.${type}`)}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field
                      id="project-municipality"
                      label={t("fields.municipality")}
                      error={errors.municipality && tf("municipalityError")}
                    >
                      <input
                        id="project-municipality"
                        {...register("municipality")}
                        placeholder={tf("municipalityPlaceholder")}
                        className={fieldClass}
                      />
                    </Field>
                  </div>
                  <Field id="project-address" label={`${tf("address")} ${tCommon("optional")}`}>
                    <input id="project-address" {...register("address")} className={fieldClass} />
                  </Field>
                </div>
              </SectionCard>

              <SectionCard icon={Calendar} title={tf("sections.datesBudget")}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field id="project-start" label={t("fields.startDate")} error={dateError("startDate")}>
                    <input id="project-start" type="date" {...register("startDate")} className={fieldClass} />
                  </Field>
                  <Field id="project-end" label={t("fields.endDate")} error={dateError("estimatedEndDate")}>
                    <input id="project-end" type="date" {...register("estimatedEndDate")} className={fieldClass} />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field
                      id="project-budget"
                      label={t("fields.budget")}
                      error={errors.budget && tf("budgetError")}
                      hint={budget > 0 ? formatCOP(budget) : undefined}
                    >
                      <input
                        id="project-budget"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={1}
                        {...register("budget")}
                        className={`${fieldClass} font-mono-data`}
                      />
                    </Field>
                  </div>
                </div>
              </SectionCard>

              <SectionCard icon={UserCog} title={tf("sections.responsible")}>
                <Field
                  id="project-responsible"
                  label={t("fields.responsible")}
                  error={errors.responsibleId && tf("responsibleRequired")}
                  hint={users && users.length === 0 ? tf("noUsers") : tf("responsibleHint")}
                >
                  <select id="project-responsible" {...register("responsibleId")} disabled={usersLoading} className={fieldClass}>
                    <option value="" disabled>
                      {usersLoading ? tCommon("loading") : tf("responsiblePlaceholder")}
                    </option>
                    {users?.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} · {tUsers(u.role === "ADMIN" ? "roleAdmin" : "roleResident")}
                      </option>
                    ))}
                  </select>
                </Field>
              </SectionCard>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Link href="/projects" className={secondaryButtonClass}>
                  {tf("cancel")}
                </Link>
                <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
                  {isSubmitting ? tCommon("saving") : tf("save")}
                </button>
              </div>
            </RevealItem>

            <RevealItem className="space-y-5">
              <div className="rounded-xl border border-line bg-surface p-5">
                <h3 className="mb-3 text-sm font-semibold text-ink">{tf("sections.cover")}</h3>
                <label className="relative flex aspect-video cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-line bg-surface-2 text-center transition-colors focus-within:border-accent hover:border-accent">
                  {coverPreview ? (
                    // Local blob preview: next/image cannot optimize blob URLs
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverPreview} alt={tf("coverAlt")} className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <>
                      <ImagePlus size={22} className="mb-1 text-ink-muted" aria-hidden />
                      <span className="text-xs text-ink-muted">{tf("coverDrop")}</span>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={handleCoverSelect} className="sr-only" />
                </label>
                <p className="mt-2 text-xs text-ink-muted">{tf("coverHint")}</p>
              </div>

              <div className="rounded-xl border border-line bg-surface p-5">
                <h3 className="mb-3 text-sm font-semibold text-ink">{tf("sections.preview")}</h3>
                <p className="font-medium text-ink">{values.name || tf("previewName")}</p>
                <p className="text-sm text-ink-muted">{values.municipality || tf("previewMunicipality")}</p>
                {durationDays !== null && (
                  <p className="mt-2 font-mono-data text-xs text-accent">{tf("durationDays", { days: durationDays })}</p>
                )}
                {budget > 0 && <p className="font-mono-data text-xs text-ink-muted">{formatCOP(budget)}</p>}
              </div>

              <div className="rounded-xl border border-line bg-surface p-5">
                <h3 className="mb-3 text-sm font-semibold text-ink">{tf("sections.checklist")}</h3>
                <ul className="space-y-2 text-sm text-ink">
                  <CheckItem done={basicDone} label={tf("checkBasic")} />
                  <CheckItem done={datesDone} label={tf("checkDates")} />
                  <CheckItem done={responsibleDone} label={tf("checkResponsible")} />
                </ul>
              </div>
            </RevealItem>
          </Reveal>
        </form>
      </main>
    </>
  );
}

export default function NewProjectPage() {
  return (
    <AdminOnly>
      <NewProjectForm />
    </AdminOnly>
  );
}
