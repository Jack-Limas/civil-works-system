"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { useIncidents, useCreateIncident, Incident } from "@/lib/incidents-service";

const schema = z.object({
  projectId: z.string().uuid("Debe ser un UUID de obra válido"),
  type: z.string().min(2, "El tipo es obligatorio"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  description: z.string().min(3, "La descripción es obligatoria"),
});

type FormValues = z.infer<typeof schema>;

const PRIORITY_LABEL: Record<Incident["priority"], string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
};

export default function IncidentsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const { data, isLoading } = useIncidents();
  const createIncident = useCreateIncident();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    await createIncident.mutateAsync(values);
    reset();
    setModalOpen(false);
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Novedades de Campo</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900"
        >
          + Reportar novedad
        </button>
      </div>

      <DataTable<Incident>
        rows={data?.data ?? []}
        isLoading={isLoading}
        rowKey={(i) => i.id}
        columns={[
          { header: "Tipo", accessor: (i) => i.type },
          { header: "Prioridad", accessor: (i) => PRIORITY_LABEL[i.priority] ?? i.priority },
          { header: "Descripción", accessor: (i) => i.description },
          { header: "ID Obra", accessor: (i) => i.projectId },
        ]}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Reportar novedad">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">ID de Obra (UUID)</label>
            <input
              {...register("projectId")}
              placeholder="UUID de la obra"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
            {errors.projectId && <p className="text-xs text-red-500">{errors.projectId.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Tipo de Novedad</label>
            <input
              {...register("type")}
              placeholder="Ej: Clima, Daño de equipo, Ausencia de personal"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
            {errors.type && <p className="text-xs text-red-500">{errors.type.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Prioridad</label>
            <select
              {...register("priority")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <option value="LOW">Baja</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Descripción</label>
            <input
              {...register("description")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
            {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
          </div>

          <button
            type="submit"
            disabled={createIncident.isPending}
            className="w-full rounded-md bg-gray-900 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
          >
            {createIncident.isPending ? "Guardando..." : "Reportar novedad"}
          </button>
        </form>
      </Modal>
    </div>
  );
}