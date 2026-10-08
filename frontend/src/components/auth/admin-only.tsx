"use client";

import { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ShieldAlert } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { Link } from "@/i18n/navigation";

/**
 * Client-side guard for admin screens. The API enforces the same rule; this
 * only avoids showing residents a form that would always answer 403.
 */
export function AdminOnly({ children }: { children: ReactNode }) {
  const t = useTranslations("forbidden");
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <div className="p-6" aria-busy="true">
        <div className="h-40 animate-pulse rounded-xl bg-surface motion-reduce:animate-none" />
      </div>
    );
  }

  if (user?.role !== "ADMIN") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
        <ShieldAlert size={32} className="text-warning" aria-hidden />
        <h1 className="text-lg font-semibold text-ink">{t("title")}</h1>
        <p className="text-sm text-ink-muted">{t("description")}</p>
        <Link href="/dashboard" className="text-sm font-medium text-accent hover:underline">
          {t("back")}
        </Link>
      </main>
    );
  }

  return <>{children}</>;
}
