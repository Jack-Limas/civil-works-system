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
    <aside className="flex w-64 shrink-0 flex-col border-r border-white/10 bg-sidebar px-4 py-6 min-h-screen text-sidebar-ink">
      {/* Bloque de Marca con Logo SVG y ObraIQ */}
      <div className="mb-8 flex items-center gap-2 px-2">
        <Logo size={30} />
        <div>
          <h1 className="text-sm font-semibold leading-tight text-white">
            {tCommon("appShortName")}
          </h1>
          <p className="text-[11px] leading-tight text-sidebar-ink">
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
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-accent text-white font-medium"
                  : "text-sidebar-ink hover:bg-white/5 hover:text-white"
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
                : "text-sidebar-ink hover:bg-white/5 hover:text-white"
            }`}
          >
            <UserCog size={17} strokeWidth={1.8} />
            {t("users")}
          </Link>
        )}
      </nav>

      <div className="mt-4 flex items-center justify-between rounded-lg bg-white/5 p-3">
        <div>
          <p className="text-xs font-medium text-white">
            {user?.name ?? "Usuario"}
          </p>
          <p className="text-[11px] text-sidebar-ink">
            {user?.role === "ADMIN" ? "Admin Pro" : "Residente"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md p-1.5 text-sidebar-ink hover:bg-white/10 hover:text-white"
          aria-label="Cerrar sesión"
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
}