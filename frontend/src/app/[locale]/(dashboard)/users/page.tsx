"use client";

import { nameInitial } from "@/lib/initials";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useFormatter, useTranslations } from "next-intl";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { useCreateUser, useUsers } from "@/lib/users-service";
import { AdminOnly } from "@/components/auth/admin-only";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "RESIDENT_ENGINEER"]),
});

type FormValues = z.infer<typeof schema>;

const fieldClass =
  "w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/30";

function UsersManager() {
  const t = useTranslations("users");
  const tv = useTranslations("validation");
  const format = useFormatter();
  const createUser = useCreateUser();
  const { data: users, isLoading } = useUsers();
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: "RESIDENT_ENGINEER" },
  });

  async function onSubmit(values: FormValues) {
    setSuccess(false);
    try {
      await createUser.mutateAsync(values);
      reset();
      setSuccess(true);
    } catch {
      // The error message is rendered from createUser.isError below
    }
  }

  return (
    <>
      <DashboardHeader title={t("title")} subtitle={t("subtitle")} />
      <main className="grid grid-cols-1 gap-5 p-4 sm:p-6 lg:grid-cols-5">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 self-start rounded-xl border border-line bg-surface p-5 lg:col-span-2"
        >
          <h2 className="text-sm font-semibold text-ink">{t("newUser")}</h2>
          <div>
            <label htmlFor="user-name" className="mb-1 block text-sm font-medium text-ink">
              {t("name")}
            </label>
            <input id="user-name" {...register("name")} placeholder={t("namePlaceholder")} className={fieldClass} />
            {errors.name && <p className="mt-1 text-xs text-critical">{tv("minChars", { min: 2 })}</p>}
          </div>

          <div>
            <label htmlFor="user-email" className="mb-1 block text-sm font-medium text-ink">
              {t("email")}
            </label>
            <input
              id="user-email"
              type="email"
              {...register("email")}
              placeholder={t("emailPlaceholder")}
              className={fieldClass}
            />
            {errors.email && <p className="mt-1 text-xs text-critical">{tv("email")}</p>}
          </div>

          <div>
            <label htmlFor="user-password" className="mb-1 block text-sm font-medium text-ink">
              {t("password")}
            </label>
            <input id="user-password" type="password" {...register("password")} className={fieldClass} />
            {errors.password && <p className="mt-1 text-xs text-critical">{tv("minChars", { min: 6 })}</p>}
          </div>

          <div>
            <label htmlFor="user-role" className="mb-1 block text-sm font-medium text-ink">
              {t("role")}
            </label>
            <select id="user-role" {...register("role")} className={fieldClass}>
              <option value="RESIDENT_ENGINEER">{t("roleResident")}</option>
              <option value="ADMIN">{t("roleAdmin")}</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={createUser.isPending}
            className="w-full rounded-md bg-accent py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {createUser.isPending ? t("creating") : t("submit")}
          </button>

          {createUser.isError && <p className="text-center text-sm text-critical">{t("createError")}</p>}
          {success && <p className="text-center text-sm font-medium text-success">{t("success")}</p>}
        </form>

        <section className="rounded-xl border border-line bg-surface lg:col-span-3">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-sm font-semibold text-ink">{t("listTitle")}</h2>
            {users && <span className="text-xs text-ink-muted">{t("count", { count: users.length })}</span>}
          </div>
          {isLoading && (
            <ul className="space-y-2 p-5" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <li key={i} className="h-12 animate-pulse rounded-lg bg-surface-2" />
              ))}
            </ul>
          )}
          {!isLoading && users?.length === 0 && (
            <p className="p-5 text-sm text-ink-muted">{t("listEmpty")}</p>
          )}
          <ul className="divide-y divide-line">
            {users?.map((u) => (
              <li key={u.id} className="flex items-center gap-3 px-5 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-medium text-accent">
                  {nameInitial(u.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{u.name}</p>
                  <p className="truncate text-xs text-ink-muted">{u.email}</p>
                </div>
                <div className="text-right">
                  <span className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-xs text-ink">
                    {t(u.role === "ADMIN" ? "roleAdmin" : "roleResident")}
                  </span>
                  <p className="mt-1 text-[11px] text-ink-muted">
                    {t("createdAt")} {format.dateTime(new Date(u.createdAt), { dateStyle: "medium" })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}

export default function UsersPage() {
  return (
    <AdminOnly>
      <UsersManager />
    </AdminOnly>
  );
}
