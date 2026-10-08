"use client";

import { useTranslations } from "next-intl";
import { ArrowLeftRight, Boxes } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";

const TABS = [
  { href: "/materials", key: "stock", icon: Boxes },
  { href: "/materials/movements", key: "movements", icon: ArrowLeftRight },
] as const;

export function InventoryTabs() {
  const t = useTranslations("inventory");
  const pathname = usePathname();

  return (
    <nav aria-label={t("moduleNav")} className="-mx-4 overflow-x-auto border-b border-line px-4 print:hidden sm:mx-0 sm:px-0">
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
