"use client";

import { useAuthStore } from "@/store/auth.store";
import { useTranslations } from "next-intl";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400 animate-pulse">
          {tCommon("loading")}
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">
          {t("welcome", { name: user?.name ?? "Usuario" })} 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {t("role")}: {user?.role ?? "N/A"}
        </p>
      </div>

      {/* Caja de depuración del estado del usuario */}
      <div className="mt-4 p-4 border rounded bg-gray-50 dark:bg-gray-900 text-xs font-mono">
        <p className="font-bold mb-1 text-gray-700 dark:text-gray-300">
          Estado actual de `user` en Zustand:
        </p>
        <pre>{JSON.stringify(user, null, 2)}</pre>
      </div>
    </div>
  );
}