"use client";

import { Search, HelpCircle } from "lucide-react";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeSwitcher } from "./theme-switcher";
import { useAuthStore } from "@/store/auth.store";
import { useAlerts } from "@/lib/alerts-service";
import { Link } from "@/i18n/navigation";

export function DashboardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const user = useAuthStore((s) => s.user);
  const { data: activeAlerts } = useAlerts("ACTIVE");
  const alertCount = activeAlerts?.length ?? 0;

  return (
    <header className="border-b border-line bg-surface">
      <div className="flex items-center justify-between gap-4 px-6 py-3">
        <div className="flex max-w-md flex-1 items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2">
          <Search size={16} className="text-ink-muted" />
          <input
            type="text"
            placeholder="Buscar proyectos o archivos..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-ink-muted"
          />
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <ThemeSwitcher />
          <Link href="/alerts" className="relative rounded-md p-2 hover:bg-surface-2">
            <span className="sr-only">Alertas</span>
            🔔
            {alertCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-critical text-[10px] font-medium text-white">
                {alertCount}
              </span>
            )}
          </Link>
          <button className="rounded-md p-2 hover:bg-surface-2"><HelpCircle size={18} className="text-ink-muted" /></button>
          <div className="h-8 w-8 rounded-full bg-accent/20 text-center text-sm font-medium leading-8 text-accent">
            {user?.name?.[0]?.toUpperCase() ?? "A"}
          </div>
        </div>
      </div>

      {title && (
        <div className="px-6 pb-4 pt-1">
          <h1 className="text-xl font-semibold">{title}</h1>
          {subtitle && <p className="text-sm text-ink-muted">{subtitle}</p>}
        </div>
      )}
    </header>
  );
}