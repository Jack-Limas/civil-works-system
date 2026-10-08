"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import {
  LayoutDashboard,
  Building2,
  Receipt,
  Package,
  FileBarChart,
  Users2,
  UserCog,
  LogOut,
  X,
  LucideIcon,
} from "lucide-react";
import { authService } from "@/lib/auth-service";
import { useAuthStore } from "@/store/auth.store";
import { useUiStore } from "@/store/ui.store";
import { Logo } from "@/components/ui/logo";
import { Role } from "@/types/auth";

interface NavLink {
  href: string;
  key: "dashboard" | "projects" | "expenses" | "materials" | "incidents" | "workers" | "users";
  icon: LucideIcon;
  roles?: Role[];
  /** Other route prefixes that belong to the same module (keeps the item highlighted). */
  also?: string[];
}

const LINKS: NavLink[] = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/projects", key: "projects", icon: Building2 },
  { href: "/expenses", key: "expenses", icon: Receipt, also: ["/suppliers", "/cash", "/cashflow"] },
  { href: "/materials", key: "materials", icon: Package },
  { href: "/incidents", key: "incidents", icon: FileBarChart },
  { href: "/workers", key: "workers", icon: Users2 },
  { href: "/users", key: "users", icon: UserCog, roles: ["ADMIN"] },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const tAuth = useTranslations("auth");
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const router = useRouter();

  async function handleLogout() {
    await authService.logout();
    setUser(null);
    router.push("/login");
  }

  const visible = LINKS.filter((l) => !l.roles || (user && l.roles.includes(user.role)));

  return (
    <div className="flex h-full flex-col px-4 py-6">
      <div className="mb-8 flex items-center gap-2 px-2">
        <Logo size={30} />
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight text-ink">{tCommon("appShortName")}</p>
          <p className="truncate text-[11px] leading-tight text-ink-muted">{tCommon("appTagline")}</p>
        </div>
      </div>

      <nav aria-label={tCommon("mainNav")} className="flex flex-1 flex-col gap-1">
        {visible.map(({ href, key, icon: Icon, also }) => {
          const active = [href, ...(also ?? [])].some((prefix) => isActive(pathname, prefix));
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                active ? "bg-accent font-medium text-white" : "text-ink-muted hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <Icon size={17} strokeWidth={active ? 2.3 : 1.8} aria-hidden />
              {t(key)}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 flex items-center justify-between gap-2 rounded-lg bg-surface-2 p-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-ink">{user?.name ?? tCommon("userFallback")}</p>
          {user && <p className="truncate text-[11px] text-ink-muted">{tCommon(`roles.${user.role}`)}</p>}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface hover:text-critical focus-visible:outline-2 focus-visible:outline-accent"
          aria-label={tAuth("logout")}
          title={tAuth("logout")}
        >
          <LogOut size={15} />
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const tCommon = useTranslations("common");
  const open = useUiStore((s) => s.mobileNavOpen);
  const setOpen = useUiStore((s) => s.setMobileNavOpen);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-line bg-surface lg:block">
        <SidebarContent />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={tCommon("mainNav")}>
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-line bg-surface shadow-2xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={tCommon("closeMenu")}
              className="absolute right-3 top-6 rounded-md p-1.5 text-ink-muted hover:bg-surface-2 hover:text-ink"
            >
              <X size={18} />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
