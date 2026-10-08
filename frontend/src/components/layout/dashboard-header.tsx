"use client";

import { nameInitial } from "@/lib/initials";
import { ReactNode } from "react";
import { Bell, Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeSwitcher } from "./theme-switcher";
import { useAuthStore } from "@/store/auth.store";
import { useUiStore } from "@/store/ui.store";
import { useAlerts } from "@/lib/alerts-service";
import { Link } from "@/i18n/navigation";

export function DashboardHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const t = useTranslations("common");
  const user = useAuthStore((s) => s.user);
  const openNav = useUiStore((s) => s.setMobileNavOpen);
  const { data: activeAlerts } = useAlerts("ACTIVE");
  const alertCount = activeAlerts?.length ?? 0;

  return (
    <header className="border-b border-line bg-surface">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => openNav(true)}
          aria-label={t("openMenu")}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-ink hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent lg:hidden"
        >
          <Menu size={18} />
        </button>

        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeSwitcher />
          <Link
            href="/alerts"
            className="relative flex h-9 w-9 items-center justify-center rounded-md border border-line bg-surface text-ink hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent"
            aria-label={`${t("viewAlerts")}: ${t("alertsCount", { count: alertCount })}`}
          >
            <Bell size={17} />
            {alertCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-critical px-1 text-[10px] font-medium text-white">
                {alertCount}
              </span>
            )}
          </Link>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-sm font-medium text-accent"
            title={user?.name}
            aria-hidden
          >
            {nameInitial(user?.name)}
          </div>
        </div>
      </div>

      {title && (
        <div className="flex flex-wrap items-end justify-between gap-3 px-4 pb-4 pt-1 sm:px-6">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-ink">{title}</h1>
            {subtitle && <p className="text-sm text-ink-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
    </header>
  );
}
