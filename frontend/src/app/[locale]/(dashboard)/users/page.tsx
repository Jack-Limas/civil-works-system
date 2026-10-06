"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { useCreateUser } from "@/lib/users-service";

const schema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  role: z.enum(["ADMIN", "RESIDENT_ENGINEER"]),
});

type FormValues = z.infer<typeof schema>;

export default function UsersPage() {
  const t = useTranslations("users");
  const createUser = useCreateUser();
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: "RESIDENT_ENGINEER",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await createUser.mutateAsync(values);
      reset();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      // Manejado por react-query o interceptor
    }
  }

  return (
    <>
      <DashboardHeader title={t("title")} subtitle={t("subtitle")} />
      <main className="max-w-md p-6">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 rounded-xl border border-line bg-surface p-5 shadow-sm"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">
              {t("name")}
            </label>
            <input
              {...register("name")}
              placeholder="Ej. Juan Pérez"
              className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:border-accent"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-critical">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink">
              {t("email")}
            </label>
            <input
              type="email"
              {...register("email")}
              placeholder="usuario@obrix.com"
              className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:border-accent"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-critical">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink">
              {t("password")}
            </label>
            <input
              type="password"
              {...register("password")}
              placeholder="••••••••"
              className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:border-accent"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-critical">
                {errors.password.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink">
              {t("role")}
            </label>
            <select
              {...register("role")}
              className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:border-accent"
            >
              <option value="RESIDENT_ENGINEER">{t("roleResident")}</option>
              <option value="ADMIN">{t("roleAdmin")}</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={createUser.isPending}
            className="w-full rounded-md bg-accent py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {createUser.isPending ? "Creando..." : t("submit")}
          </button>

          {success && (
            <p className="text-center text-sm font-medium text-success">
              {t("success")}
            </p>
          )}
        </form>
      </main>
    </>
  );
}