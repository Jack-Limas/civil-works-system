"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { useProjects, useCreateProject, Project } from "@/lib/projects-service";

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
  startDate: z.string(),
  estimatedEndDate: z.string(),
  budget: z.coerce.number().positive(),
  responsibleId: z.string().uuid(),
});

type FormValues = z.infer<typeof schema>;

const STATUS_LABEL: Record<Project["status"], string> = {
  PLANNED: "Planificada",
  IN_PROGRESS: "En ejecución",
  SUSPENDED: "Suspendida",
  FINISHED: "Finalizada",
};

export default function ProjectsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const t = useTranslations("projects");
  const tCommon = useTranslations("common");

  const { data, isLoading } = useProjects();
  const createProject = useCreateProject();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    await createProject.mutateAsync(values);
    reset();
    setModalOpen(false);
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 transition-colors"
        >
          + {t("newProject")}
        </button>
      </div>

      <DataTable<Project>
        rows={data?.data ?? []}
        isLoading={isLoading}
        rowKey={(p) => p.id}
        columns={[
          { header: t("fields.name"), accessor: (p) => p.name },
          { header: t("fields.municipality"), accessor: (p) => p.municipality },
          { header: t("fields.status"), accessor: (p) => STATUS_LABEL[p.status] ?? p.status },
          { header: t("fields.progress"), accessor: (p) => `${p.progressPercentage}%` },
          {
            header: t("fields.budget"),
            accessor: (p) => `$${Number(p.budget).toLocaleString("es-CO")}`,
          },
          { header: t("fields.responsible"), accessor: (p) => p.responsible?.name ?? "—" },
        ]}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t("newProject")}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">{t("fields.name")}</label>
            <input
              {...register("name")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
            {errors.name && <p className="text-xs text-red-500">{tCommon("errors.minLength", { count: 3 })}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t("fields.type")}</label>
            <select
              {...register("type")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <option value="STADIUM">Estadio</option>
              <option value="POOL">Piscina</option>
              <option value="SYNTHETIC_FIELD">Cancha sintética</option>
              <option value="RETAINING_WALL">Muro de contención</option>
              <option value="PRIVATE_WORK">Obra particular</option>
              <option value="OTHER">Otro</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t("fields.municipality")}</label>
            <input
              {...register("municipality")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-sm font-medium">{t("fields.startDate")}</label>
              <input
                type="date"
                {...register("startDate")}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("fields.endDate")}</label>
              <input
                type="date"
                {...register("estimatedEndDate")}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t("fields.budget")}</label>
            <input
              type="number"
              {...register("budget")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t("fields.responsibleId")}</label>
            <input
              {...register("responsibleId")}
              placeholder="UUID"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
          </div>

          <button
            type="submit"
            disabled={createProject.isPending}
            className="w-full rounded-md bg-gray-900 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
          >
            {createProject.isPending ? tCommon("saving") : tCommon("create")}
          </button>
        </form>
      </Modal>
    </div>
  );
}