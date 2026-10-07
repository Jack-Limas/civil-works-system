"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  LayoutDashboard,
  Building2,
  Receipt,
  Package,
  FileBarChart,
  Users2,
  UserCog,
  LogOut,
} from "lucide-react";
import { authService } from "@/lib/auth-service";
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "@/i18n/navigation";
import { Logo } from "@/components/ui/logo";

const links = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/projects", key: "projects", icon: Building2 },
  { href: "/expenses", key: "expenses", icon: Receipt },
  { href: "/materials", key: "materials", icon: Package },
  { href: "/incidents", key: "incidents", icon: FileBarChart },
  { href: "/workers", key: "workers", icon: Users2 },
] as const;

export function Sidebar() {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  async function handleLogout() {
    await authService.logout();
    setUser(null);
    router.push("/login");
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-6 min-h-screen">
      {/* Bloque de Marca con Logo SVG y ObraIQ */}
      <div className="mb-8 flex items-center gap-2 px-2">
        <Logo size={30} />
        <div>
          <h1 className="text-sm font-semibold leading-tight text-ink">
            {tCommon("appShortName")}
          </h1>
          <p className="text-[11px] leading-tight text-ink-muted">
            {tCommon("appTagline")}
          </p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {links.map(({ href, key, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-accent text-white font-medium"
                  : "text-ink-muted hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <Icon size={17} strokeWidth={active ? 2.3 : 1.8} />
              {t(key)}
            </Link>
          );
        })}

        {/* Opción de Usuarios / Gestión de Cuentas (Solo ADMIN) */}
        {user?.role === "ADMIN" && (
          <Link
            href="/users"
            className={`mt-auto flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
              pathname === "/users"
                ? "bg-accent text-white font-medium"
                : "text-ink-muted hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <UserCog size={17} strokeWidth={1.8} />
            {t("users")}
          </Link>
        )}
      </nav>

      <div className="mt-4 flex items-center justify-between rounded-lg bg-surface-2 p-3">
        <div>
          <p className="text-xs font-medium text-ink">
            {user?.name ?? "Usuario"}
          </p>
          <p className="text-[11px] text-ink-muted">
            {user?.role === "ADMIN" ? "Admin Pro" : "Residente"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md p-1.5 text-ink-muted hover:bg-surface hover:text-critical transition-colors"
          aria-label="Cerrar sesión"
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
}