"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { ArrowLeft, Building2 } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { useCreateProject } from "@/lib/projects-service";

const schema = z.object({
  name: z.string().min(3),
  type: z.enum(["STADIUM", "POOL", "SYNTHETIC_FIELD", "RETAINING_WALL", "PRIVATE_WORK", "OTHER"]),
  municipality: z.string().min(2),
  address: z.string().optional(),
  startDate: z.string(),
  estimatedEndDate: z.string(),
  budget: z.coerce.number().positive(),
  responsibleId: z.string().uuid(),
});
type FormValues = z.infer<typeof schema>;

export default function NewProjectPage() {
  const t = useTranslations("projects");
  const router = useRouter();
  const createProject = useCreateProject();

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    const created = await createProject.mutateAsync(values);
    router.push(`/projects/${(created as any).id}`);
  }

  return (
    <>
      <DashboardHeader title={t("newProject")} subtitle="Configura los detalles técnicos y financieros para iniciar una obra." />

      <main className="mx-auto max-w-3xl space-y-5 p-6">
        <div className="flex items-center justify-between">
          <Link href="/projects" className="flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
            <ArrowLeft size={14} /> Volver a Obras
          </Link>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <section className="rounded-xl border border-line bg-surface p-5">
            <div className="mb-4 flex items-center gap-2">
              <Building2 size={16} className="text-accent" />
              <h2 className="font-semibold">Información Básica</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">{t("fields.name")}</label>
                <input {...register("name")} placeholder="Ej: Cancha sintética La Unión" className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm" />
                {errors.name && <p className="mt-1 text-xs text-critical">Mínimo 3 caracteres</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">{t("fields.type")}</label>
                  <select {...register("type")} className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm">
                    {["STADIUM", "POOL", "SYNTHETIC_FIELD", "RETAINING_WALL", "PRIVATE_WORK", "OTHER"].map((opt) => (
                      <option key={opt} value={opt}>{t(`types.${opt}`)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t("fields.municipality")}</label>
                  <input {...register("municipality")} className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Dirección (opcional)</label>
                <input {...register("address")} className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm" />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-line bg-surface p-5">
            <h2 className="mb-4 font-semibold">Fechas y Presupuesto</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">{t("fields.startDate")}</label>
                <input type="date" {...register("startDate")} className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t("fields.endDate")}</label>
                <input type="date" {...register("estimatedEndDate")} className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium">{t("fields.budget")}</label>
                <input type="number" {...register("budget")} className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm" />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-line bg-surface p-5">
            <h2 className="mb-4 font-semibold">Responsable</h2>
            <div>
              <label className="mb-1 block text-sm font-medium">ID del responsable</label>
              <input {...register("responsibleId")} placeholder="UUID del usuario" className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm" />
            </div>
          </section>

          <div className="flex justify-end gap-2">
            <Link href="/projects" className="rounded-md border border-line px-4 py-2 text-sm hover:bg-surface-2">Cancelar</Link>
            <button type="submit" disabled={createProject.isPending} className="rounded-md bg-accent px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
              {createProject.isPending ? "Guardando..." : "Guardar Proyecto"}
            </button>
          </div>
        </form>
      </main>
    </>
  );
}