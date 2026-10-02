"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  LayoutDashboard,
  Building2,
  Package,
  Users,
  Receipt,
  AlertTriangle,
  LogOut,
} from "lucide-react";
import { authService } from "@/lib/auth-service";
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "@/i18n/navigation";

const links = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/projects", key: "projects", icon: Building2 },
  { href: "/materials", key: "materials", icon: Package },
  { href: "/workers", key: "workers", icon: Users },
  { href: "/expenses", key: "expenses", icon: Receipt },
  { href: "/alerts", key: "alerts", icon: AlertTriangle },
] as const;

export function Sidebar() {
  const tNav = useTranslations("nav");
  const tAuth = useTranslations("auth");
  const pathname = usePathname();
  const setUser = useAuthStore((s) => s.setUser);
  const router = useRouter();

  async function handleLogout() {
    await authService.logout();
    setUser(null);
    router.push("/login");
  }

  return (
    <aside className="flex w-60 flex-col border-r border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-6 px-2 text-lg font-bold">🏗️ Obras Civiles</h2>

      <nav className="flex flex-1 flex-col gap-1">
        {links.map(({ href, key, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
              pathname === href
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                : "hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <Icon size={16} />
            {tNav(key)}
          </Link>
        ))}
      </nav>

      <button
        onClick={handleLogout}
        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
      >
        <LogOut size={16} />
        {tAuth("logout")}
      </button>
    </aside>
  );
}