"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { useMaterials, useCreateMaterial, Material } from "@/lib/materials-service";

const schema = z.object({
  name: z.string().min(2, "El nombre es obligatorio"),
  unit: z.string().min(1, "La unidad es obligatoria"),
  stockMinimum: z.coerce.number().min(0, "El stock mínimo debe ser 0 o mayor"),
});

type FormValues = z.infer<typeof schema>;

export default function MaterialsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const { data, isLoading } = useMaterials();
  const createMaterial = useCreateMaterial();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    await createMaterial.mutateAsync(values);
    reset();
    setModalOpen(false);
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Materiales</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900"
        >
          + Nuevo material
        </button>
      </div>

      <DataTable<Material>
        rows={data?.data ?? []}
        isLoading={isLoading}
        rowKey={(m) => m.id}
        columns={[
          { header: "Nombre", accessor: (m) => m.name },
          { header: "Unidad", accessor: (m) => m.unit },
          { header: "Stock Disponible", accessor: (m) => m.stockAvailable },
          { header: "Stock Mínimo", accessor: (m) => m.stockMinimum },
        ]}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo material">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Nombre</label>
            <input
              {...register("name")}
              placeholder="Ej: Cemento de alta resistencia"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Unidad de medida</label>
            <input
              {...register("unit")}
              placeholder="Ej: Bultos, M3, Toneladas"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
            {errors.unit && <p className="text-xs text-red-500">{errors.unit.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Stock Mínimo</label>
            <input
              type="number"
              {...register("stockMinimum")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
            {errors.stockMinimum && <p className="text-xs text-red-500">{errors.stockMinimum.message}</p>}
          </div>

          <button
            type="submit"
            disabled={createMaterial.isPending}
            className="w-full rounded-md bg-gray-900 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
          >
            {createMaterial.isPending ? "Guardando..." : "Crear material"}
          </button>
        </form>
      </Modal>
    </div>
  );
}