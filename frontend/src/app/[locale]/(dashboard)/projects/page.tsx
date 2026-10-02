"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { useProjects, useCreateProject, Project } from "@/lib/projects-service";

const schema = z.object({
  name: z.string().min(3),
  type: z.enum(["STADIUM", "POOL", "SYNTHETIC_FIELD", "RETAINING_WALL", "PRIVATE_WORK", "OTHER"]),
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
  const { data, isLoading } = useProjects();
  const createProject = useCreateProject();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    await createProject.mutateAsync(values);
    reset();
    setModalOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Obras</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white dark:bg-white dark:text-gray-900"
        >
          + Nueva obra
        </button>
      </div>

      <DataTable<Project>
        rows={data?.data ?? []}
        isLoading={isLoading}
        rowKey={(p) => p.id}
        columns={[
          { header: "Nombre", accessor: (p) => p.name },
          { header: "Municipio", accessor: (p) => p.municipality },
          { header: "Estado", accessor: (p) => STATUS_LABEL[p.status] },
          { header: "Avance", accessor: (p) => `${p.progressPercentage}%` },
          { header: "Presupuesto", accessor: (p) => `$${Number(p.budget).toLocaleString("es-CO")}` },
          { header: "Responsable", accessor: (p) => p.responsible?.name ?? "—" },
        ]}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva obra">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Nombre</label>
            <input {...register("name")} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
            {errors.name && <p className="text-xs text-red-500">Mínimo 3 caracteres</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Tipo</label>
            <select {...register("type")} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800">
              <option value="STADIUM">Estadio</option>
              <option value="POOL">Piscina</option>
              <option value="SYNTHETIC_FIELD">Cancha sintética</option>
              <option value="RETAINING_WALL">Muro de contención</option>
              <option value="PRIVATE_WORK">Obra particular</option>
              <option value="OTHER">Otro</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Municipio</label>
            <input {...register("municipality")} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Fecha inicio</label>
              <input type="date" {...register("startDate")} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Fecha fin est.</label>
              <input type="date" {...register("estimatedEndDate")} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Presupuesto</label>
            <input type="number" {...register("budget")} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">ID del responsable</label>
            <input {...register("responsibleId")} placeholder="UUID del usuario" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
          </div>

          <button
            type="submit"
            disabled={createProject.isPending}
            className="w-full rounded-md bg-gray-900 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
          >
            {createProject.isPending ? "Guardando..." : "Crear obra"}
          </button>
        </form>
      </Modal>
    </div>
  );
}