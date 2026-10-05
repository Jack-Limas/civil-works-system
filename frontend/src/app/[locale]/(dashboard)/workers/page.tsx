"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { useWorkers, useCreateWorker, Worker } from "@/lib/workers-service";

const schema = z.object({
  name: z.string().min(3, "Mínimo 3 caracteres"),
  documentId: z.string().min(5, "Documento obligatorio"),
  position: z.string().min(2, "Cargo obligatorio"),
  projectId: z.string().uuid().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export default function WorkersPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const { data, isLoading } = useWorkers();
  const createWorker = useCreateWorker();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      projectId: values.projectId || undefined,
    };
    await createWorker.mutateAsync(payload);
    reset();
    setModalOpen(false);
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Trabajadores</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900"
        >
          + Nuevo trabajador
        </button>
      </div>

      <DataTable<Worker>
        rows={data?.data ?? []}
        isLoading={isLoading}
        rowKey={(w) => w.id}
        columns={[
          { header: "Nombre", accessor: (w) => w.name },
          { header: "Documento", accessor: (w) => w.documentId },
          { header: "Cargo", accessor: (w) => w.position },
          { header: "Obra asignada", accessor: (w) => w.project?.name ?? "Sin asignar" },
        ]}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo trabajador">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Nombre Completo</label>
            <input
              {...register("name")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Documento de Identidad</label>
            <input
              {...register("documentId")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
            {errors.documentId && <p className="text-xs text-red-500">{errors.documentId.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Cargo / Posición</label>
            <input
              {...register("position")}
              placeholder="Ej: Residente, Operador, Maestro de Obra"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
            {errors.position && <p className="text-xs text-red-500">{errors.position.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">ID de Obra (Opcional)</label>
            <input
              {...register("projectId")}
              placeholder="UUID de la obra"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
          </div>

          <button
            type="submit"
            disabled={createWorker.isPending}
            className="w-full rounded-md bg-gray-900 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
          >
            {createWorker.isPending ? "Guardando..." : "Crear trabajador"}
          </button>
        </form>
      </Modal>
    </div>
  );
}