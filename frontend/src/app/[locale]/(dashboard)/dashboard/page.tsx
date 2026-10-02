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

  // Si el backend devuelve name lo usa; si no, muestra "Administrador" si es ADMIN o "Usuario"
  const displayName =
    user?.name || (user?.role === "ADMIN" ? "Administrador" : "Usuario");

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">
        {t("welcome", { name: displayName })} 👋
      </h1>
      <p className="text-gray-500 dark:text-gray-400">
        {t("role")}: {user?.role ?? "N/A"}
      </p>
    </div>
  );
}