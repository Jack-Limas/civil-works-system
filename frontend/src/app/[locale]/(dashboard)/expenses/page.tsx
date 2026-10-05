"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { useExpenses, useCreateExpense, Expense } from "@/lib/expenses-service";

const schema = z.object({
  projectId: z.string().uuid("Debe ser un UUID válido"),
  category: z.string().min(2, "Categoría obligatoria"),
  amount: z.coerce.number().positive("Monto debe ser positivo"),
  description: z.string().min(3, "Descripción obligatoria"),
});

type FormValues = z.infer<typeof schema>;

export default function ExpensesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const { data, isLoading } = useExpenses();
  const createExpense = useCreateExpense();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    await createExpense.mutateAsync(values);
    reset();
    setModalOpen(false);
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gastos</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900"
        >
          + Registrar gasto
        </button>
      </div>

      <DataTable<Expense>
        rows={data?.data ?? []}
        isLoading={isLoading}
        rowKey={(e) => e.id}
        columns={[
          { header: "Categoría", accessor: (e) => e.category },
          { header: "Monto", accessor: (e) => `$${Number(e.amount).toLocaleString("es-CO")}` },
          { header: "Descripción", accessor: (e) => e.description },
          { header: "ID Obra", accessor: (e) => e.projectId },
        ]}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar gasto">
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
            <label className="mb-1 block text-sm font-medium">Categoría</label>
            <input
              {...register("category")}
              placeholder="Ej: Materiales, Nómina, Maquinaria"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
            {errors.category && <p className="text-xs text-red-500">{errors.category.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Monto ($)</label>
            <input
              type="number"
              {...register("amount")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
            {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
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
            disabled={createExpense.isPending}
            className="w-full rounded-md bg-gray-900 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
          >
            {createExpense.isPending ? "Guardando..." : "Registrar gasto"}
          </button>
        </form>
      </Modal>
    </div>
  );
}