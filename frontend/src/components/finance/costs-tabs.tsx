"use client";

import { useTranslations } from "next-intl";
import { ArrowLeftRight, LayoutGrid, PlusCircle, Store, Wallet } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";

const TABS = [
  { href: "/expenses", key: "summary", icon: LayoutGrid },
  { href: "/expenses/new", key: "register", icon: PlusCircle },
  { href: "/suppliers", key: "suppliers", icon: Store },
  { href: "/cash", key: "cash", icon: Wallet },
  { href: "/cashflow", key: "cashflow", icon: ArrowLeftRight },
] as const;

/** Sub-navigation shared by every screen of the cost module. */
export function CostsTabs() {
  const t = useTranslations("finance");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("moduleNav")}
      className="-mx-4 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0"
    >
      <ul className="flex min-w-max gap-1">
        {TABS.map(({ href, key, icon: Icon }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                  active ? "border-accent font-medium text-accent" : "border-transparent text-ink-muted hover:text-ink"
                }`}
              >
                <Icon size={15} aria-hidden />
                {t(`tabs.${key}`)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
