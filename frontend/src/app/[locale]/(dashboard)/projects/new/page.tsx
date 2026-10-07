"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Calendar,
  UserCog,
  CheckCircle2,
  Circle,
  ImagePlus,
  LucideIcon,
} from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/navigation";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { useCreateProject } from "@/lib/projects-service";
import { useUploadEvidence } from "@/lib/evidence-service";

const schema = z.object({
  name: z.string().min(3),
  type: z.enum([
    "STADIUM",
    "POOL",
    "SYNTHETIC_FIELD",
    "RETAINING_WALL",
    "PRIVATE_WORK",
    "OTHER",
  ]),
  municipality: z.string().min(2),
  address: z.string().optional(),
  startDate: z.string(),
  estimatedEndDate: z.string(),
  budget: z.coerce.number().positive(),
  responsibleId: z.string().uuid(),
});

type FormValues = z.infer<typeof schema>;

const fieldClass =
  "w-full rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/30";

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-line bg-surface p-5"
    >
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <Icon size={16} />
        </div>
        <h2 className="font-semibold text-ink">{title}</h2>
      </div>
      {children}
    </motion.section>
  );
}

export default function NewProjectPage() {
  const t = useTranslations("projects");
  const router = useRouter();
  const createProject = useCreateProject();
  const uploadEvidence = useUploadEvidence();

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const values = useWatch({ control });

  const basicDone = !!(values?.name && values?.municipality);
  const datesDone = !!(
    values?.startDate &&
    values?.estimatedEndDate &&
    values?.budget
  );
  const responsibleDone = !!values?.responsibleId;

  const durationDays =
    values?.startDate && values?.estimatedEndDate
      ? Math.max(
          0,
          Math.round(
            (new Date(values.estimatedEndDate).getTime() -
              new Date(values.startDate).getTime()) /
              86400000
          )
        )
      : null;

  function handleCoverSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  }

  async function onSubmit(formValues: FormValues) {
    const created = (await createProject.mutateAsync(formValues)) as unknown as {
      id: string;
    };

    if (coverFile && created?.id) {
      const formData = new FormData();
      formData.append("projectId", created.id);
      formData.append("description", "Foto principal del proyecto");
      formData.append("file", coverFile);
      await uploadEvidence.mutateAsync(formData);
    }

    if (created?.id) {
      router.push(`/projects/${created.id}`);
    } else {
      router.push("/projects");
    }
  }

  return (
    <>
      <DashboardHeader
        title={t("newProject")}
        subtitle="Configura los detalles técnicos y financieros para iniciar una obra."
      />

      <main className="mx-auto max-w-5xl p-6">
        <Link
          href="/projects"
          className="mb-4 flex w-fit items-center gap-1 text-sm text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft size={14} /> Volver a Obras
        </Link>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 gap-5 lg:grid-cols-3"
        >
          {/* Columna del formulario */}
          <div className="space-y-5 lg:col-span-2">
            <SectionCard icon={Building2} title="Información Básica">
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink">
                    {t("fields.name")}
                  </label>
                  <input
                    {...register("name")}
                    placeholder="Ej: Cancha sintética La Unión"
                    className={fieldClass}
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-critical">
                      Mínimo 3 caracteres
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink">
                      {t("fields.type")}
                    </label>
                    <select
                      {...register("type")}
                      className={`${fieldClass} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="%2364748b"><path d="M5 7l5 5 5-5"/></svg>')] bg-[length:14px] bg-[right_10px_center] bg-no-repeat pr-8`}
                    >
                      {[
                        "STADIUM",
                        "POOL",
                        "SYNTHETIC_FIELD",
                        "RETAINING_WALL",
                        "PRIVATE_WORK",
                        "OTHER",
                      ].map((opt) => (
                        <option key={opt} value={opt}>
                          {t(`types.${opt}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink">
                      {t("fields.municipality")}
                    </label>
                    <input
                      {...register("municipality")}
                      placeholder="Ej: Pasto"
                      className={fieldClass}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink">
                    Dirección (opcional)
                  </label>
                  <input {...register("address")} className={fieldClass} />
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={Calendar} title="Fechas y Presupuesto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink">
                    {t("fields.startDate")}
                  </label>
                  <input
                    type="date"
                    {...register("startDate")}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink">
                    {t("fields.endDate")}
                  </label>
                  <input
                    type="date"
                    {...register("estimatedEndDate")}
                    className={fieldClass}
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-sm font-medium text-ink">
                    {t("fields.budget")}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
                      $
                    </span>
                    <input
                      type="number"
                      {...register("budget")}
                      className={`${fieldClass} pl-6`}
                    />
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={UserCog} title="Responsable">
              <label className="mb-1 block text-sm font-medium text-ink">
                ID del responsable
              </label>
              <input
                {...register("responsibleId")}
                placeholder="UUID del usuario"
                className={fieldClass}
              />
              <p className="mt-1 text-xs text-ink-muted">
                Copia el UUID desde Prisma Studio o la página de Usuarios.
              </p>
            </SectionCard>

            <div className="flex justify-end gap-2">
              <Link
                href="/projects"
                className="rounded-md border border-line px-4 py-2 text-sm text-ink hover:bg-surface-2 transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={createProject.isPending}
                className="rounded-md bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {createProject.isPending ? "Guardando..." : "Guardar Proyecto"}
              </button>
            </div>
          </div>

          {/* Panel lateral: foto + vista previa + checklist */}
          <div className="space-y-5">
            <div className="rounded-xl border border-line bg-surface p-5">
              <h3 className="mb-3 text-sm font-semibold text-ink">
                Fotografía Principal
              </h3>
              <label className="relative flex aspect-video cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-line bg-surface-2 text-center hover:border-accent transition-colors">
                {coverPreview ? (
                  <Image
                    src={coverPreview}
                    alt="Vista previa"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <>
                    <ImagePlus size={22} className="mb-1 text-ink-muted" />
                    <span className="text-xs text-ink-muted">
                      Arrastra una imagen o haz clic
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverSelect}
                  className="hidden"
                />
              </label>
              <p className="mt-2 text-xs text-ink-muted">
                Esta imagen aparecerá como evidencia principal de la obra.
              </p>
            </div>

            <div className="rounded-xl border border-line bg-surface p-5">
              <h3 className="mb-3 text-sm font-semibold text-ink">Vista Previa</h3>
              <p className="font-medium text-ink">
                {values?.name || "Nombre de la obra"}
              </p>
              <p className="text-sm text-ink-muted">
                {values?.municipality || "Municipio"}
              </p>
              {durationDays !== null && (
                <p className="mt-2 font-mono-data text-xs text-accent">
                  {durationDays} días de ejecución estimada
                </p>
              )}
              {values?.budget && Number(values.budget) > 0 && (
                <p className="font-mono-data text-xs text-ink-muted">
                  ${Number(values.budget).toLocaleString("es-CO")}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-line bg-surface p-5">
              <h3 className="mb-3 text-sm font-semibold text-ink">
                Resumen de Creación
              </h3>
              <ul className="space-y-2 text-sm text-ink">
                <li className="flex items-center gap-2">
                  {basicDone ? (
                    <CheckCircle2 size={15} className="text-emerald-500" />
                  ) : (
                    <Circle size={15} className="text-ink-muted" />
                  )}
                  Información básica
                </li>
                <li className="flex items-center gap-2">
                  {datesDone ? (
                    <CheckCircle2 size={15} className="text-emerald-500" />
                  ) : (
                    <Circle size={15} className="text-ink-muted" />
                  )}
                  Fechas y presupuesto
                </li>
                <li className="flex items-center gap-2">
                  {responsibleDone ? (
                    <CheckCircle2 size={15} className="text-emerald-500" />
                  ) : (
                    <Circle size={15} className="text-ink-muted" />
                  )}
                  Responsable asignado
                </li>
              </ul>
            </div>
          </div>
        </form>
      </main>
    </>
  );
}