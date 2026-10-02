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
    <div>
      <h1 className="text-2xl font-bold">
        {t("welcome", { name: user?.name ?? "Usuario" })} 👋
      </h1>
      <p className="text-gray-500 dark:text-gray-400">
        {t("role")}: {user?.role ?? "N/A"}
      </p>
    </div>
  );
}